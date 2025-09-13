import { useEffect, useState } from "react";

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

export type DeliveryMethod = "truck" | "ship" | "air";

export type DeliveryRoute = {
    method: DeliveryMethod;
    distance: number; // km
    gasolineConsumption: number; // L
    co2Emission: number; // kg
};

export type DeliveryResult = {
    distance: number; // km
    gasolineConsumption: number; // ガソリン消費量 (L)
    co2Emission: number; // CO2排出量 (kg)
};

function calculateDistance(from: GeoCoords, to: GeoCoords): number {
    return 100; // 仮の距離計算
}

function calculateGasolineConsumption(method: DeliveryMethod, distance: number): number {
    return 10; // 仮のガソリン消費量計算
}

function calculateCO2Emission(gasolineConsumption: number): number {
    return gasolineConsumption * 2.31; // 仮のCO2排出量計算 (kg)
}

export const useGame = () => {
    const [deliveryStack, setDeliveryStack] = useState<Building[]>([]);
    const [deliveryRouteStack, setDeliveryRouteStack] = useState<DeliveryRoute[]>([]);
    const [deliveryResult, setDeliveryResult] = useState<DeliveryResult>({
        distance: 0,
        gasolineConsumption: 0,
        co2Emission: 0,
    });

    const pushDeliveryStack = (building: Building) => {
        let method: DeliveryMethod;
        if (building.type === "port") {
            method = "ship";
        } else {
            method = "truck";
        }
    };

    const initDeliveryStack = () => {
        setDeliveryStack([]);
    };

    const Game = {
        delivery: {
            stack: deliveryStack,
            initStack: initDeliveryStack,
            pushStack: pushDeliveryStack,
            routeStack: deliveryRouteStack,
            result: deliveryResult,
        },
    };

    return Game;
};
