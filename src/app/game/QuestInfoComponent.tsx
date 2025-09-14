"use client";

import React from "react";
import { useGameContext } from "./GameContext";

const QuestInfoComponent: React.FC = () => {
    const { currentQuest, completeDeliveryEvent, deliveryResult, gamePhase, deliveryStack } = useGameContext();

    if (gamePhase !== "delivery" || !currentQuest) {
        return null;
    }

    return (
        <div className="bg-white bg-opacity-90 rounded-lg shadow-md p-4" style={{ minWidth: "300px" }}>
            <div className="font-bold mb-2 text-orange-600">配送クエスト</div>

            <div className="space-y-2 text-sm">
                <div className="p-2 bg-orange-50 rounded">
                    <div className="font-semibold">{currentQuest.description}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                        <div className="font-semibold">出発地:</div>
                        <div>{currentQuest.from.name}</div>
                    </div>
                    <div>
                        <div className="font-semibold">目的地:</div>
                        <div>{currentQuest.to.name}</div>
                    </div>
                </div>

                <div className="border-t pt-2">
                    <div className="font-semibold text-xs mb-1">最適解:</div>
                    <div className="text-xs text-gray-600">CO2排出量: {currentQuest.optimalCO2.toFixed(2)}kg</div>
                </div>

                <div className="border-t pt-2">
                    <div className="font-semibold text-xs mb-1">選択された地点:</div>
                    <div className="text-xs text-gray-600 max-h-20 overflow-y-auto">
                        {deliveryStack.length === 0 ? (
                            <div className="text-orange-500">地点を選択してください</div>
                        ) : (
                            deliveryStack.map((building, index) => (
                                <div key={building.id}>
                                    {index + 1}. {building.name} ({building.type})
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="border-t pt-2">
                    <div className="font-semibold text-xs mb-1">現在のルート:</div>
                    <div className="text-xs space-y-1">
                        <div>距離: {deliveryResult.distance.toFixed(1)}km</div>
                        <div>CO2排出量: {deliveryResult.co2Emission.toFixed(2)}kg</div>
                        <div>燃料消費: {deliveryResult.gasolineConsumption.toFixed(2)}L</div>
                    </div>
                </div>

                <button onClick={completeDeliveryEvent} className="w-full bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded text-sm mt-3">
                    配送完了
                </button>
            </div>
        </div>
    );
};

export default QuestInfoComponent;
