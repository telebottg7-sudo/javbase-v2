import React from "react";
import { NavView } from "../../types";
import { EntityCatalogView } from "./EntityCatalogView";

interface StudioViewProps {
  onNavigate?: (view: NavView) => void;
}

export const StudioView: React.FC<StudioViewProps> = ({ onNavigate }) => {
  return <EntityCatalogView entityType="studio" onNavigate={onNavigate} />;
};
