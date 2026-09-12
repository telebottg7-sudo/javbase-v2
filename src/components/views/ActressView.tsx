import React from "react";
import { NavView } from "../../types";
import { EntityCatalogView } from "./EntityCatalogView";

interface ActressViewProps {
  onNavigate?: (view: NavView) => void;
}

export const ActressView: React.FC<ActressViewProps> = ({ onNavigate }) => {
  return <EntityCatalogView entityType="actress" onNavigate={onNavigate} />;
};
