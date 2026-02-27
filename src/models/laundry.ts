import mongoose, { InferSchemaType } from "mongoose";

const serviceSchema = new mongoose.Schema({
  _id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    default: () => new mongoose.Types.ObjectId(),
  },
  name: { type: String, required: true },
  price: { type: Number, required: true },
});

export type ServiceType = InferSchemaType<typeof serviceSchema>;

const laundrySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  laundryName: { type: String, required: true },
  city: { type: String, required: true },
  country: { type: String, required: true },
  deliveryPrice: { type: Number, required: true },
  estimatedDeliveryTime: { type: Number, required: true },
  facilities: [{ type: String, required: true }],
  services: [serviceSchema],
  imageUrl: { type: String, required: true },
  lastUpdated: { type: Date, required: true },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: false, // Sementara opsional agar data lama tidak error
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: false,
    }
  }
});

laundrySchema.index({ location: "2dsphere" });

const Laundry = mongoose.model("Laundry", laundrySchema);
export default Laundry;
