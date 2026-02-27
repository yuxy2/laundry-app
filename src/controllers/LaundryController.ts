import { Request, Response } from "express";
import * as LaundryService from "../services/LaundryService";
import { sendSuccess, sendError } from "../utils/responseWrapper";

const getLaundry = async (req: Request, res: Response) => {
  try {
    const laundryId = req.params.laundryId;
    const laundry = await LaundryService.getLaundryById(laundryId);
    return sendSuccess(res, laundry, "Laundry retrieved successfully");
  } catch (error: any) {
    console.log(error);
    if (error.message === "Laundry not found") {
      return sendError(res, error.message, 404);
    }
    return sendError(res, "Something went wrong", 500);
  }
};

const searchLaundry = async (req: Request, res: Response) => {
  try {
    const city = req.params.city;

    const searchResult = await LaundryService.searchLaundry(city, {
      searchQuery: req.query.searchQuery as string,
      selectedFacilities: req.query.selectedFacilities as string,
      sortOption: req.query.sortOption as string,
      page: parseInt(req.query.page as string),
      latitude: req.query.lat ? parseFloat(req.query.lat as string) : undefined,
      longitude: req.query.lng ? parseFloat(req.query.lng as string) : undefined,
    });

    if (searchResult.pagination.total === 0) {
      return res.status(404).json(searchResult); // Maintaining backward compatibility for the 404 shape or wrap in error if needed, although sending searchResult under success makes sense
    }
    
    // sendSuccess payload wraps `data` over our response data. 
    // To match original format where it returns { data, pagination }, we'll just pass searchResult as the data property.
    return sendSuccess(res, searchResult, "Search completed successfully");
  } catch (error) {
    console.log(error);
    return sendError(res, "Something went wrong", 500);
  }
};

export default {
  getLaundry,
  searchLaundry,
};
