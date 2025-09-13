import { PortBuilding } from "./GameContext";
import portGeo from "./port.json";

export const portPoint = {
    getGeoJSON: () => portGeo,
    getPorts: (): PortBuilding[] => {
        return portGeo.features.map((feature, i) => ({
            type: "port" as const,
            id: i + 1,
            name: feature.properties?.port || `港 #${i + 1}`,
            coords: {
                latitude: feature.geometry.coordinates[1],
                longitude: feature.geometry.coordinates[0],
            },
        }));
    },
};
