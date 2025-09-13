"use client";

import { GeoRoutesClient, CalculateRoutesCommand, CalculateRoutesCommandInput } from "@aws-sdk/client-geo-routes";
import { withAPIKey } from "@aws/amazon-location-utilities-auth-helper";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";

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

const authHelper = withAPIKey(process.env.NEXT_PUBLIC_AWS_LOCATION_API_KEY!, "us-east-1");
const locationClient = new GeoRoutesClient(authHelper.getClientConfig());

async function calculateDistance(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }): Promise<number> {
    const routeCalcParams: CalculateRoutesCommandInput = {
        TravelMode: "Car",
        Destination: [to.longitude, to.latitude],
        Origin: [from.longitude, from.latitude],
    };
    try {
        const command = new CalculateRoutesCommand(routeCalcParams); // ← 修正済み
        const response = await locationClient.send(command);

        console.log("Successfully calculated route. The distance in kilometers is : ", response);

        return (response.Routes![0].Summary?.Distance ?? 0) / 1000;
    } catch (caught: unknown) {
        if (caught instanceof Error) {
            console.error("Unexpected error:", caught);
        }
    }
    return 0;
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
    pushDeliveryStack: (building: Building) => Promise<void>;
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

    const pushDeliveryStack = useCallback(async (building: Building) => {
        let method: DeliveryMethod;
        if (building.type === "port") {
            method = "ship";
        } else {
            method = "truck";
        }

        // 最新のスタックを取得
        setDeliveryStack((currentStack) => {
            // 同じBuildingが既に存在する場合は無視
            if (currentStack.some((existingBuilding) => existingBuilding.id === building.id)) {
                return currentStack;
            }
            // 非同期処理を別途実行
            (async () => {
                // 距離を計算（非同期処理を待つ）
                const distance = currentStack.length === 0 ? 0 : await calculateDistance(currentStack[currentStack.length - 1].coords, building.coords);
                const gasolineConsumption = calculateGasolineConsumption(method, distance);
                const co2Emission = calculateCO2Emission(gasolineConsumption);

                // ルートスタックを更新
                setDeliveryRouteStack((prevRouteStack) => [
                    ...prevRouteStack,
                    {
                        method,
                        distance,
                        gasolineConsumption,
                        co2Emission,
                    },
                ]);

                // 結果を更新
                setDeliveryResult((prevResult) => ({
                    distance: prevResult.distance + distance,
                    gasolineConsumption: prevResult.gasolineConsumption + gasolineConsumption,
                    co2Emission: prevResult.co2Emission + co2Emission,
                }));
            })();

            return [...currentStack, building];
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
