import React from "react";
import { Navigate } from "react-router-dom";

// Collection Boxes now lives as a tab inside the My Collection page.
const CollectionBoxes = () => <Navigate to="/collection?tab=boxes" replace />;

export default CollectionBoxes;
