"use client";

import { useState } from "react";
import LoadingSpinner from "../LoadingSpinner";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000/api/v1";

interface VehicleInput {
  name: string;
  type: string;
  max_weight_kg: string;
}

interface CargoInput {
  name: string;
  type: string;
  weight_kg: string;
}
