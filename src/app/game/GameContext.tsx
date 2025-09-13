"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Building, DeliveryMethod, DeliveryRoute, DeliveryResult } from "./game";

function calculateDistance(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }): number {
    return 100; // 仮の距離計算
}

function calculateGasolineConsumption(method: DeliveryMethod, distance: number): number {
    const nenpi = 7.5; //燃費(km/L)
    return distance * nenpi; //ガソリン消費量計算(L)
}

function calculateCO2Emission(gasolineConsumption: number): number {
    return gasolineConsumption * 2.31; //仮のCO2排出量計算(kg)
}

interface GameContextType {
    deliveryStack: Building[];
    deliveryRouteStack: DeliveryRoute[];
    deliveryResult: DeliveryResult;
    pushDeliveryStack: (building: Building) => void;
    initDeliveryStack: () => void;
}

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [deliveryStack, setDeliveryStack] = useState<Building[]>([]);
    const [deliveryRouteStack, setDeliveryRouteStack] = useState<DeliveryRoute[]>([]);
    const [deliveryResult, setDeliveryResult] = useState<DeliveryResult>({
        distance: 0,
        gasolineConsumption: 0,
        co2Emission: 0,
    });

    const pushDeliveryStack = useCallback((building: Building) => {
        let method: DeliveryMethod;
        if (building.type === "port") {
            method = "ship";
        } else {
            method = "truck";
        }

        setDeliveryStack((prevStack) => {
            const distance = prevStack.length === 0 ? 0 : calculateDistance(prevStack[prevStack.length - 1].coords, building.coords);
            const gasolineConsumption = calculateGasolineConsumption(method, distance);
            const co2Emission = calculateCO2Emission(gasolineConsumption);

            setDeliveryRouteStack((prevRouteStack) => [
                ...prevRouteStack,
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

            return [...prevStack, building];
        });
    }, []);

    const initDeliveryStack = useCallback(() => {
        setDeliveryStack([]);
        setDeliveryRouteStack([]);
        setDeliveryResult({
            distance: 0,
            gasolineConsumption: 0,
            co2Emission: 0,
        });
    }, []);

    return (
        <GameContext.Provider
            value={{
                deliveryStack,
                deliveryRouteStack,
                deliveryResult,
                pushDeliveryStack,
                initDeliveryStack,
            }}
        >
            {children}
        </GameContext.Provider>
    );
};

export const useGameContext = (): GameContextType => {
    const context = useContext(GameContext);
    if (context === undefined) {
        throw new Error("useGameContext must be used within a GameProvider");
    }
    return context;
};
