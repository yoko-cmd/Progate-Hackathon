"use client";

import { GeoRoutesClient, CalculateRoutesCommand, CalculateRoutesCommandInput } from "@aws-sdk/client-geo-routes";
import { withAPIKey } from "@aws/amazon-location-utilities-auth-helper";

import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { PortRouteValidator } from "./portRouteValidator";

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

// 直線距離を計算する関数（Haversine formula）
function calculateStraightLineDistance(from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }): number {
    const R = 6371; // 地球の半径（km）
    const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
    const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((from.latitude * Math.PI) / 180) * Math.cos((to.latitude * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // 距離（km）
}

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
    switch (method) {
        case "ship":
            return distance * 0.015; //燃費(L/t/km)
        case "air":
            return distance * 0.2; //仮の燃費計算(L/km)
        case "truck":
            return distance * 7.5; //燃費(km/L)
        default:
            return 0;
    }
}

function calculateCO2Emission(gasolineConsumption: number): number {
    return gasolineConsumption * 2.31; //仮のCO2排出量計算(kg)
}

interface GameContextType {
    deliveryStack: Building[];
    deliveryRouteStack: DeliveryRoute[];
    deliveryResult: DeliveryResult;
    currentYear: string;
    availableYears: string[];
    pushDeliveryStack: (building: Building) => Promise<void>;
    removeFromDeliveryStack: (building: Building) => void;
    initDeliveryStack: () => void;
    setCurrentYear: (year: string) => void;
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
    const [currentYear, setCurrentYear] = useState<string>("2017");
    const [availableYears, setAvailableYears] = useState<string[]>([]);

    // PortRouteValidatorを初期化
    useEffect(() => {
        const initializeValidator = async () => {
            await PortRouteValidator.initialize();
            const years = PortRouteValidator.getAvailableYears();
            setAvailableYears(years);
            if (years.length > 0 && !years.includes(currentYear)) {
                setCurrentYear(years[0]);
            }
        };
        initializeValidator();
    }, [currentYear]);

    // ルートを再計算する関数
    const recalculateRoutes = useCallback(async (stack: Building[]) => {
        console.log("Recalculating routes for stack:", stack);

        if (stack.length === 0) {
            console.log("Stack is empty, resetting routes");
            setDeliveryRouteStack([]);
            setDeliveryResult({
                distance: 0,
                gasolineConsumption: 0,
                co2Emission: 0,
            });
            return;
        }

        const newRoutes: DeliveryRoute[] = [];
        let totalDistance = 0;
        let totalGasolineConsumption = 0;
        let totalCO2Emission = 0;

        for (let i = 1; i < stack.length; i++) {
            const fromBuilding = stack[i - 1];
            const toBuilding = stack[i];

            let method: DeliveryMethod;
            if (toBuilding.type === "port") {
                method = "ship";
            } else {
                method = "truck";
            }

            // 距離を計算
            let distance: number;
            if (method === "ship") {
                distance = calculateStraightLineDistance(fromBuilding.coords, toBuilding.coords);
            } else {
                distance = await calculateDistance(fromBuilding.coords, toBuilding.coords);
            }

            const gasolineConsumption = calculateGasolineConsumption(method, distance);
            const co2Emission = calculateCO2Emission(gasolineConsumption);

            const route: DeliveryRoute = {
                method,
                distance,
                gasolineConsumption,
                co2Emission,
            };

            newRoutes.push(route);
            totalDistance += distance;
            totalGasolineConsumption += gasolineConsumption;
            totalCO2Emission += co2Emission;
        }

        console.log("New routes calculated:", newRoutes);
        console.log("Total results:", { totalDistance, totalGasolineConsumption, totalCO2Emission });

        setDeliveryRouteStack(newRoutes);
        setDeliveryResult({
            distance: totalDistance,
            gasolineConsumption: totalGasolineConsumption,
            co2Emission: totalCO2Emission,
        });
    }, []);

    const removeFromDeliveryStack = useCallback(
        (building: Building) => {
            console.log("Removing building from stack:", building);
            setDeliveryStack((currentStack) => {
                const buildingIndex = currentStack.findIndex((b) => b.id === building.id);
                if (buildingIndex === -1) return currentStack;

                // 削除する建物より後のルートを再計算する必要がある
                const newStack = currentStack.filter((_, index) => index !== buildingIndex);

                // ルートとリザルトを再計算
                recalculateRoutes(newStack);
                console.log("New stack after removal:", newStack);

                return newStack;
            });
        },
        [recalculateRoutes]
    );

    const pushDeliveryStack = useCallback(
        async (building: Building) => {
            console.log("pushDeliveryStack called with building:", building);

            setDeliveryStack((currentStack) => {
                console.log("Current stack in setState:", currentStack);

                // 既に存在するかチェック
                const existingIndex = currentStack.findIndex((existingBuilding) => existingBuilding.id === building.id);
                console.log("Existing index:", existingIndex);

                if (existingIndex !== -1) {
                    console.log("Building exists, removing...");
                    const newStack = currentStack.filter((_, index) => index !== existingIndex);
                    console.log("New stack after removal:", newStack);

                    // 削除後のルート再計算
                    setTimeout(() => recalculateRoutes(newStack), 0);

                    return newStack;
                }

                console.log("Building does not exist, adding...");

                // 新しい建物を追加する処理
                let method: DeliveryMethod;
                if (building.type === "port") {
                    method = "ship";
                } else {
                    method = "truck";
                }

                // 港から港への配送の場合、ルート検証を行う
                if (currentStack.length > 0) {
                    const lastBuilding = currentStack[currentStack.length - 1];
                    if (lastBuilding.type === "port" && building.type === "port") {
                        // 港間のルートが有効かチェック
                        console.log(`Checking route for year ${currentYear}: ${lastBuilding.name} -> ${building.name}`);
                        const isValid = PortRouteValidator.isValidRoute(lastBuilding.name, building.name, currentYear);
                        console.log(`Route validation result: ${isValid}`);

                        if (!isValid) {
                            console.warn(`Invalid port route for year ${currentYear}: ${lastBuilding.name} -> ${building.name}`);
                            alert(`${currentYear}年のデータでは、${lastBuilding.name}港から${building.name}港への配送ルートは利用できません。`);
                            return currentStack; // 無効なルートの場合は追加しない
                        }
                    }
                }

                const newStack = [...currentStack, building];
                console.log("New stack after addition:", newStack);

                // 追加後のルート計算（非同期）
                setTimeout(async () => {
                    if (currentStack.length > 0) {
                        let distance: number;
                        if (method === "ship") {
                            distance = calculateStraightLineDistance(currentStack[currentStack.length - 1].coords, building.coords);
                        } else {
                            distance = await calculateDistance(currentStack[currentStack.length - 1].coords, building.coords);
                        }

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
                    }
                }, 0);

                return newStack;
            });
        },
        [currentYear, recalculateRoutes]
    );

    const initDeliveryStack = useCallback(() => {
        setDeliveryStack([]);
        setDeliveryRouteStack([]);
        setDeliveryResult({
            distance: 0,
            gasolineConsumption: 0,
            co2Emission: 0,
        });
    }, []);

    const handleSetCurrentYear = useCallback(
        (year: string) => {
            setCurrentYear(year);
            // 年度変更時にルートをクリア（オプション）
            initDeliveryStack();
        },
        [initDeliveryStack]
    );

    return (
        <GameContext.Provider
            value={{
                deliveryStack,
                deliveryRouteStack,
                deliveryResult,
                currentYear,
                availableYears,
                pushDeliveryStack,
                removeFromDeliveryStack,
                initDeliveryStack,
                setCurrentYear: handleSetCurrentYear,
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
