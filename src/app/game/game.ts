import { useState } from "react";

type GeoCoords = {
    latitude: number; // 緯度
    longitude: number; // 経度
};

export interface Building {
    type: "port" | "storage";
    id: number;
    name: string;
    coords: GeoCoords;
}

export type PortBuilding = Building & {
    type: "port";
};

export type StorageBuilding = Building & {
    type: "storage";
};

export const useGame = () => {
    const [deliveryStack, setDeliveryStack] = useState<Building[]>([]);

    const Game = {
        delivery: {
            stack: deliveryStack,
            setStack: setDeliveryStack,
        },
    };

    return Game;
};
