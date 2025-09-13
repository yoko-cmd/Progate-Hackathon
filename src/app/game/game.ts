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
    const nenpi = 7.5;//燃費(km/L)
    return distance * nenpi//ガソリン消費量計算(L)
}

function calculateCO2Emission(gasolineConsumption: number): number {
    return gasolineConsumption * 2.31; //仮のCO2排出量計算(kg)
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

        const distance = deliveryStack.length === 0 ? 0 : calculateDistance(deliveryStack[deliveryStack.length - 1].coords, building.coords);
        const gasolineConsumption = calculateGasolineConsumption(method, distance);
        const co2Emission = calculateCO2Emission(gasolineConsumption);
        setDeliveryStack((prevStack) => [...prevStack, building]);
        setDeliveryRouteStack((prevStack) => [
            ...prevStack,
            {
                method,
                distance,
                gasolineConsumption,
                co2Emission,
            },
        ]);
        setDeliveryResult((prevResult) => ({
            distance: prevResult.distance + distance,
            gasolineConsumption: prevResult.gasolineConsumption + gasolineConsumption,
            co2Emission: prevResult.co2Emission + co2Emission,
        }));
    };

    const initDeliveryStack = () => {
        setDeliveryStack([]);
        setDeliveryRouteStack([]);
        setDeliveryResult({
            distance: 0,
            gasolineConsumption: 0,
            co2Emission: 0,
        });
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
