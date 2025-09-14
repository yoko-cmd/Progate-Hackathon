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

// すごろく関連の型定義
export type GamePhase = "dice" | "delivery" | "gameOver";

export type Player = {
    id: number;
    name: string;
    position: number; // すごろくボード上の位置
    score: number; // スコア（CO2削減量などで計算）
    totalCO2Saved: number; // 累計CO2削減量
};

export type DeliveryQuest = {
    id: number;
    from: Building;
    to: Building;
    optimalCO2: number; // 最適解のCO2排出量
    description: string;
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

        // Routes[0].Legsの中にVehicle以外のtype（Ferry等）が含まれていないかチェック
        if (response.Routes && response.Routes[0] && response.Routes[0].Legs) {
            const hasNonVehicleTransport = response.Routes[0].Legs.some((leg) => {
                // legのTravelModeがCarでない場合（Ferry、Walk等）は移動禁止
                if (leg.TravelMode && leg.TravelMode !== "Car") {
                    console.warn(`Non-vehicle transport detected: ${leg.TravelMode}`);
                    return true;
                }

                // GeometryやTypeでもチェック（フェリーやその他の交通手段を検出）
                if (leg.Type && leg.Type.toLowerCase().includes("ferry")) {
                    console.warn(`Ferry transport detected in leg type: ${leg.Type}`);
                    return true;
                }

                return false;
            });

            if (hasNonVehicleTransport) {
                console.warn("Route contains non-vehicle transport (Ferry, Walk, etc.). Movement prohibited.");
                return 0; // 移動禁止の場合は距離0を返す
            }
        }

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

    // すごろく関連
    gamePhase: GamePhase;
    currentPlayer: Player;
    players: Player[];
    currentQuest: DeliveryQuest | null;
    diceValue: number;
    isGameStarted: boolean;
    boardPositions: Building[]; // すごろくボードの各マス（建物）

    // すごろくアクション
    rollDice: () => void;
    movePlayer: (steps: number) => void;
    startDeliveryEvent: () => void;
    completeDeliveryEvent: () => void;
    nextPlayer: () => void;
    startGame: (playerNames: string[]) => void;
    resetGame: () => void;
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

    // すごろく関連の状態
    const [gamePhase, setGamePhase] = useState<GamePhase>("dice");
    const [currentPlayer, setCurrentPlayer] = useState<Player>({
        id: 0,
        name: "Player 1",
        position: 0,
        score: 0,
        totalCO2Saved: 0,
    });
    const [players, setPlayers] = useState<Player[]>([]);
    const [currentQuest, setCurrentQuest] = useState<DeliveryQuest | null>(null);
    const [diceValue, setDiceValue] = useState<number>(0);
    const [isGameStarted, setIsGameStarted] = useState<boolean>(false);
    const [boardPositions, setBoardPositions] = useState<Building[]>([]);

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

    // ボードポジションを初期化（港を除外して倉庫のみ）
    useEffect(() => {
        const initializeBoardPositions = async () => {
            // storagePointからボードポジションを作成（港は除外）
            const { storagePoint } = await import("./storagePoint");

            const storages = storagePoint.getStorages();

            // 日本を横断するようなルートを作成（北から南、または西から東）
            // 緯度でソート（北から南）
            const sortedBuildings = storages.sort((a, b) => b.coords.latitude - a.coords.latitude);

            setBoardPositions(sortedBuildings);
        };

        initializeBoardPositions();
    }, []);

    // ルートを再計算する関数
    const recalculateRoutes = useCallback(
        async (stack: Building[]): Promise<{ invalidRouteDetected?: boolean; validStackLength?: number } | void> => {
            console.log("Recalculating routes for stack:", stack);

            if (!currentQuest) {
                console.log("No current quest, resetting routes");
                setDeliveryRouteStack([]);
                setDeliveryResult({
                    distance: 0,
                    gasolineConsumption: 0,
                    co2Emission: 0,
                });
                return;
            }

            // 配送スタックに開始地点を含めた完全なルートを作成
            const completeRoute = [currentQuest.from, ...stack];

            if (completeRoute.length <= 1) {
                console.log("Route is too short, resetting routes");
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

            for (let i = 1; i < completeRoute.length; i++) {
                const fromBuilding = completeRoute[i - 1];
                const toBuilding = completeRoute[i];

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

                    // calculateDistanceが0を返した場合（フェリーなど非車両交通手段が含まれる場合）
                    if (distance === 0) {
                        console.warn(`Route from ${fromBuilding.name} to ${toBuilding.name} contains non-vehicle transport. Removing invalid route.`);
                        // 無効なルートが含まれる場合、そこまでのスタックで計算を停止
                        const validStack = stack.slice(0, i - 1); // i-1にして無効な建物自体を除外

                        alert(
                            `${fromBuilding.name}から${toBuilding.name}への陸路ルートには車両以外の交通手段（フェリーなど）が含まれているため、${toBuilding.name}以降のルートは削除されました。`
                        );

                        // 有効な部分のみでルートを再計算（再帰的な呼び出しを避けるため、直接値を設定）
                        const validRoutes = newRoutes.slice(0, i - 1);
                        const validTotalDistance = validRoutes.reduce((sum, route) => sum + route.distance, 0);
                        const validTotalGasolineConsumption = validRoutes.reduce((sum, route) => sum + route.gasolineConsumption, 0);
                        const validTotalCO2Emission = validRoutes.reduce((sum, route) => sum + route.co2Emission, 0);

                        setDeliveryRouteStack(validRoutes);
                        setDeliveryResult({
                            distance: validTotalDistance,
                            gasolineConsumption: validTotalGasolineConsumption,
                            co2Emission: validTotalCO2Emission,
                        });

                        // deliveryStackの更新は呼び出し元で行う（状態更新の競合を避けるため）
                        // setDeliveryStack(validStack);の代わりに、戻り値で通知
                        return { invalidRouteDetected: true, validStackLength: validStack.length };
                    }
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
        },
        [currentQuest]
    );

    const removeFromDeliveryStack = useCallback(
        (building: Building) => {
            console.log("Removing building from stack:", building);
            setDeliveryStack((currentStack) => {
                const buildingIndex = currentStack.findIndex((b) => b.id === building.id);
                if (buildingIndex === -1) return currentStack;

                // 削除する建物より後のルートを再計算する必要がある
                const newStack = currentStack.filter((_, index) => index !== buildingIndex);

                // ルートとリザルトを再計算
                setTimeout(async () => {
                    await recalculateRoutes(newStack);
                }, 0);
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

                // 追加後のルート再計算（非同期）
                setTimeout(async () => {
                    const result = await recalculateRoutes(newStack);
                    if (result?.invalidRouteDetected) {
                        // 無効なルートが検出された場合、deliveryStackを有効な部分まで縮小
                        setDeliveryStack((prevStack) => prevStack.slice(0, result.validStackLength));
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

    // すごろく関連のメソッド
    const movePlayer = useCallback(
        (steps: number) => {
            setCurrentPlayer((prev) => {
                const newPosition = Math.min(prev.position + steps, boardPositions.length - 1);
                const updatedPlayer = { ...prev, position: newPosition };

                // players配列も同時に更新
                setPlayers((prevPlayers) => prevPlayers.map((p) => (p.id === prev.id ? updatedPlayer : p)));

                return updatedPlayer;
            });
        },
        [boardPositions.length]
    );

    const startDeliveryEvent = useCallback(() => {
        if (boardPositions.length === 0) return;

        const currentBuilding = boardPositions[currentPlayer.position];
        if (!currentBuilding) return;

        // ランダムに目的地を選択（現在地以外）
        const availableDestinations = boardPositions.filter((_, index) => index !== currentPlayer.position);
        const randomDestination = availableDestinations[Math.floor(Math.random() * availableDestinations.length)];

        // 最適解を計算（簡単な直線距離ベース）
        const distance = calculateStraightLineDistance(currentBuilding.coords, randomDestination.coords);
        const optimalMethod: DeliveryMethod = randomDestination.type === "port" ? "ship" : "truck";
        const optimalGasoline = calculateGasolineConsumption(optimalMethod, distance);
        const optimalCO2 = calculateCO2Emission(optimalGasoline);

        const quest: DeliveryQuest = {
            id: Date.now(),
            from: currentBuilding,
            to: randomDestination,
            optimalCO2: optimalCO2,
            description: `${currentBuilding.name}から${randomDestination.name}に荷物を届けてください`,
        };

        setCurrentQuest(quest);
        setGamePhase("delivery");

        // 配送スタックを初期化（開始地点は含めない）
        initDeliveryStack();
    }, [boardPositions, currentPlayer.position, initDeliveryStack]);

    const rollDice = useCallback(() => {
        if (gamePhase !== "dice") return;

        const value = Math.floor(Math.random() * 6) + 1;
        setDiceValue(value);
        movePlayer(value);

        // 移動後、発送イベントを開始
        setTimeout(() => {
            startDeliveryEvent();
        }, 1000);
    }, [gamePhase, movePlayer, startDeliveryEvent]);

    const nextPlayer = useCallback(() => {
        if (players.length === 0) return;

        const currentIndex = players.findIndex((p) => p.id === currentPlayer.id);
        const nextIndex = (currentIndex + 1) % players.length;
        const nextPlayerData = players[nextIndex];

        setCurrentPlayer(nextPlayerData);
        setGamePhase("dice");
        setDiceValue(0); // サイコロの値をリセット
    }, [players, currentPlayer.id]);

    const completeDeliveryEvent = useCallback(() => {
        if (!currentQuest) return;

        // 目的地に到達しているかチェック
        // 配送スタックが空の場合は開始地点にいることを意味し、
        // スタックに要素がある場合は最後の要素が現在地
        const isAtDestination =
            deliveryStack.length === 0
                ? currentQuest.from.id === currentQuest.to.id // 開始地点と目的地が同じ場合
                : deliveryStack[deliveryStack.length - 1].id === currentQuest.to.id;

        if (!isAtDestination) {
            alert("目的地に到達していません！");
            return;
        }

        // スコア計算（CO2削減率に基づく）
        const playerCO2 = deliveryResult.co2Emission;
        const optimalCO2 = currentQuest.optimalCO2;
        const co2Saved = Math.max(0, optimalCO2 - playerCO2);
        const scoreGained = Math.floor(co2Saved * 10);

        setCurrentPlayer((prev) => ({
            ...prev,
            score: prev.score + scoreGained,
            totalCO2Saved: prev.totalCO2Saved + co2Saved,
        }));

        // プレイヤーリストも更新
        setPlayers((prev) =>
            prev.map((p) => (p.id === currentPlayer.id ? { ...p, score: p.score + scoreGained, totalCO2Saved: p.totalCO2Saved + co2Saved } : p))
        );

        alert(`配送完了！ CO2削減量: ${co2Saved.toFixed(2)}kg, 獲得スコア: ${scoreGained}点`);

        setCurrentQuest(null);
        initDeliveryStack();
        nextPlayer();
    }, [currentQuest, deliveryStack, deliveryResult, currentPlayer, initDeliveryStack, nextPlayer]);

    const startGame = useCallback(
        (playerNames: string[]) => {
            const newPlayers: Player[] = playerNames.map((name, index) => ({
                id: index,
                name,
                position: 0,
                score: 0,
                totalCO2Saved: 0,
            }));

            setPlayers(newPlayers);
            setCurrentPlayer(newPlayers[0]);
            setIsGameStarted(true);
            setGamePhase("dice");
            initDeliveryStack();
        },
        [initDeliveryStack]
    );

    const resetGame = useCallback(() => {
        setPlayers([]);
        setCurrentPlayer({
            id: 0,
            name: "Player 1",
            position: 0,
            score: 0,
            totalCO2Saved: 0,
        });
        setIsGameStarted(false);
        setGamePhase("dice");
        setCurrentQuest(null);
        setDiceValue(0);
        initDeliveryStack();
    }, [initDeliveryStack]);

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

                // すごろく関連
                gamePhase,
                currentPlayer,
                players,
                currentQuest,
                diceValue,
                isGameStarted,
                boardPositions,

                // すごろくアクション
                rollDice,
                movePlayer,
                startDeliveryEvent,
                completeDeliveryEvent,
                nextPlayer,
                startGame,
                resetGame,
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
