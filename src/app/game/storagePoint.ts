import { StorageBuilding } from "./game";
import geoPoint from "./storage.json";

export const storagePoint = {
    getGeoJSON: () => geoPoint,
    getStorages: (): StorageBuilding[] => {
        return geoPoint.features.map((feature, i) => ({
            type: "storage" as const,
            id: i + 1,
            name: feature.properties?.name || `物流センター #${i + 1}`,
            coords: {
                latitude: feature.geometry.coordinates[1],
                longitude: feature.geometry.coordinates[0],
            },
        }));
    },
};
