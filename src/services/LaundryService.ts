import Laundry from "../models/laundry";

export const getLaundryById = async (laundryId: string) => {
  const laundry = await Laundry.findById(laundryId);
  if (!laundry) {
    throw new Error("Laundry not found");
  }
  return laundry;
};

export const searchLaundry = async (
  city: string,
  options: {
    searchQuery?: string;
    selectedFacilities?: string;
    sortOption?: string;
    page?: number;
    latitude?: number;
    longitude?: number;
  }
) => {
  const { searchQuery = "", selectedFacilities = "", sortOption = "lastUpdated", page = 1, latitude, longitude } = options;
  let query: any = {};

  // Memastikan pencarian berdasarkan kota tetap berjalan (Case-Insensitive)
  query["city"] = new RegExp(city, "i");
  
  if (selectedFacilities) {
    const facilitiesArray = selectedFacilities
      .split(",")
      .map((facility) => new RegExp(facility, "i"));

    query["facilities"] = { $all: facilitiesArray };
  }

  if (searchQuery) {
    const searchRegex = new RegExp(searchQuery, "i");
    query["$or"] = [
      { laundryName: searchRegex },
      { facilities: { $in: [searchRegex] } },
    ];
  }

  // Count docs cannot use $near operator
  const total = await Laundry.countDocuments(query);

  if (total === 0) {
    return {
      data: [],
      pagination: {
        total: 0,
        page: 1,
        pages: 1,
      },
    };
  }

  const pageSize = 10;
  const skip = (page - 1) * pageSize;

  let findQuery = Laundry.find(query);

  // Apply $near ONLY to the find payload, NOT the count payload
  if (latitude && longitude) {
    query["location"] = {
      $near: {
        $geometry: {
          type: "Point",
          coordinates: [longitude, latitude], // Longitude first according to GeoJSON specification!
        },
        $maxDistance: 50000, // Optional: Hanya mencari radius maks 50KM, hilangkan limit jika ingin tanpa batas
      },
    };
    findQuery = Laundry.find(query); // Re-instantiate array with the new nearest query
    
    // Sort logic ignores other sorts if distance is primarily requested. 
    // MongoDB automatically calculates nearest first.
  } else {
    // Apabila tanpa point/peta, pakai normal sort dari filter opsi
    findQuery = findQuery.sort({ [sortOption]: 1 });
  }

  const laundrys = await findQuery
    .skip(skip)
    .limit(pageSize)
    .lean();

  return {
    data: laundrys,
    pagination: {
      total,
      page,
      pages: Math.ceil(total / pageSize),
    },
  };
};
