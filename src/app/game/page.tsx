"use client";

import React, { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Font Awesomeのインポートを追加
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faIndustry } from "@fortawesome/free-solid-svg-icons";
import { renderToStaticMarkup } from "react-dom/server";

// GeoJSONデータのインポート
import { useGameContext } from "./GameContext";
import { storagePoint } from "./storagePoint";
import { portPoint } from "./portPoint";

// 新しいコンポーネントのインポート
import DiceComponent from "./DiceComponent";
import PlayerInfoComponent from "./PlayerInfoComponent";
import QuestInfoComponent from "./QuestInfoComponent";
import GameStartComponent from "./GameStartComponent";

const ClickToAddPinMap: React.FC = () => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);

    const {
        deliveryStack,
        deliveryResult,
        pushDeliveryStack,
        currentYear,
        availableYears,
        setCurrentYear,
        isGameStarted,
        players,
        currentPlayer,
        boardPositions,
        gamePhase,
        currentQuest,
    } = useGameContext();

    const storageBuildings = storagePoint.getStorages();
    const portBuildings = portPoint.getPorts();

    useEffect(() => {
        if (map.current) return;

        const apiKey = process.env.NEXT_PUBLIC_AWS_LOCATION_API_KEY!;
        const region = "us-east-1";
        const style = "Standard";
        const colorScheme = "Light";
        const styleUrl = `https://maps.geo.${region}.amazonaws.com/v2/styles/${style}/descriptor?key=${apiKey}&color-scheme=${colorScheme}`;

        if (mapContainer.current) {
            map.current = new maplibregl.Map({
                container: mapContainer.current,
                style: styleUrl,
                center: [138.2529, 36.2048],
                zoom: 5,
            });

            map.current.on("load", () => {
                // マップが読み込まれた後、マーカーは別のuseEffectで管理
            });
        }

        return () => {
            // if (map.current) {
            //     map.current.remove();
            //     map.current = null;
            // }
        };
    }, []); // 依存配列は空にして、マップ初期化は一度だけ行う

    // マーカーを管理する別のuseEffect
    useEffect(() => {
        if (!map.current || !map.current.isStyleLoaded()) return;

        // 既存のマーカーをすべて削除
        document.querySelectorAll(".storage-marker").forEach((el) => el.remove());
        document.querySelectorAll(".port-marker").forEach((el) => el.remove());

        // 倉庫マーカー
        storageBuildings.forEach((storage) => {
            const iconHtml = renderToStaticMarkup(<FontAwesomeIcon icon={faIndustry} style={{ color: "#fb6aaeff", fontSize: "30px" }} />);

            // HTML要素を作成し、アイコンを挿入
            const el = document.createElement("div");
            el.className = "storage-marker";
            el.innerHTML = iconHtml;

            // マーカーのスタイルを調整
            el.style.transform = "translate(-50%, -100%)"; // ピンの底辺を座標に合わせる
            el.style.cursor = "pointer"; // カーソルをポインターに変更

            // delivery フェーズ中は枠線を追加して選択可能であることを示す
            if (gamePhase === "delivery") {
                el.style.filter = "drop-shadow(0 0 8px rgba(255, 255, 0, 0.8))";
                el.style.outline = "2px solid #ffff00";
                el.style.outlineOffset = "2px";
            }

            el.addEventListener("click", () => {
                console.log("Storage clicked:", storage.name, "Game phase:", gamePhase);
                if (gamePhase === "delivery") {
                    pushDeliveryStack(storage);
                }
            });

            new maplibregl.Marker({ element: el }).setLngLat([storage.coords.longitude, storage.coords.latitude]).addTo(map.current!);
        });

        // 港マーカー
        portBuildings.forEach((port) => {
            const el = document.createElement("div");
            el.className = "port-marker";
            el.style.backgroundColor = "#0000ff"; // 青丸などで区別
            el.style.width = "16px";
            el.style.height = "16px";
            el.style.borderRadius = "50%";
            el.style.border = "2px solid #ffffff";
            el.style.boxSizing = "border-box";
            el.style.transform = "translate(-50%, -50%)";
            el.style.cursor = "pointer"; // カーソルをポインターに変更

            // delivery フェーズ中はボーダーを明るくして選択可能であることを示す
            if (gamePhase === "delivery") {
                el.style.border = "3px solid #ffff00";
                el.style.boxShadow = "0 0 10px rgba(255, 255, 0, 0.5)";
            }

            el.addEventListener("click", () => {
                console.log("Port clicked:", port.name, "Game phase:", gamePhase);
                if (gamePhase === "delivery") {
                    pushDeliveryStack(port);
                }
            });

            new maplibregl.Marker({ element: el }).setLngLat([port.coords.longitude, port.coords.latitude]).addTo(map.current!);
        });

        return () => {
            // クリーンアップで既存のマーカーを削除
            document.querySelectorAll(".storage-marker").forEach((el) => el.remove());
            document.querySelectorAll(".port-marker").forEach((el) => el.remove());
        };
    }, [storageBuildings, pushDeliveryStack, portBuildings, gamePhase]); // pushDeliveryStackを依存配列に追加    // プレイヤーマーカーを表示するエフェクト
    useEffect(() => {
        if (!map.current || !isGameStarted || boardPositions.length === 0) return;

        // 既存のプレイヤーマーカーをすべて削除
        document.querySelectorAll(".player-marker").forEach((el) => el.remove());

        // 各プレイヤーの位置にマーカーを追加
        players.forEach((player, index) => {
            const building = boardPositions[player.position];
            if (!building) return;

            const el = document.createElement("div");
            el.className = "player-marker";
            el.style.backgroundColor = player.id === currentPlayer.id ? "#ff4444" : "#ffaa44";
            el.style.width = "20px";
            el.style.height = "20px";
            el.style.borderRadius = "50%";
            el.style.border = "3px solid #ffffff";
            el.style.boxSizing = "border-box";
            el.style.transform = "translate(-50%, -50%)";
            el.style.position = "relative";
            el.style.zIndex = "1000";

            // プレイヤー番号を表示
            el.innerHTML = `<div style="
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                color: white;
                font-size: 10px;
                font-weight: bold;
            ">${index + 1}</div>`;

            new maplibregl.Marker({ element: el }).setLngLat([building.coords.longitude, building.coords.latitude]).addTo(map.current!);
        });

        return () => {
            document.querySelectorAll(".player-marker").forEach((el) => el.remove());
        };
    }, [players, currentPlayer, boardPositions, isGameStarted]);

    useEffect(() => {
        if (!map.current) return;

        // 既存の中継地点マーカーをすべて削除
        document.querySelectorAll(".relay-marker").forEach((el) => el.remove());
        
        // 現在地（開始地点）のマーカーを追加
        if (currentQuest && gamePhase === "delivery") {
            const startEl = document.createElement("div");
            startEl.className = "relay-marker start-marker";
            startEl.style.backgroundColor = "#00ff00";  // 緑色で開始地点を表示
            startEl.style.width = "16px";
            startEl.style.height = "16px";
            startEl.style.borderRadius = "50%";
            startEl.style.border = "3px solid #ffffff";
            startEl.style.boxSizing = "border-box";
            startEl.style.transform = "translate(-50%, -50%)";

            new maplibregl.Marker({ element: startEl })
                .setLngLat([currentQuest.from.coords.longitude, currentQuest.from.coords.latitude])
                .addTo(map.current!);
        }
        
        // 中継地点マーカーを追加
        deliveryStack.forEach((stack) => {
            const el = document.createElement("div");
            el.className = "relay-marker";
            el.style.backgroundColor = "#ff0000";
            el.style.width = "12px";
            el.style.height = "12px";
            el.style.borderRadius = "50%";
            el.style.border = "2px solid #ffffff";
            el.style.boxSizing = "border-box";
            el.style.transform = "translate(-50%, -50%)";

            new maplibregl.Marker({ element: el }).setLngLat([stack.coords.longitude, stack.coords.latitude]).addTo(map.current!);
        });

        // 配送ルートの線を描画（開始地点から）
        const lineId = "relay-line";
        if (map.current.getLayer(lineId)) {
            map.current.removeLayer(lineId);
        }
        if (map.current.getSource(lineId)) {
            map.current.removeSource(lineId);
        }
        
        if (currentQuest && gamePhase === "delivery" && deliveryStack.length >= 1) {
            // 開始地点から配送スタックの全ての地点までの線を描画
            const lineCoordinates = [
                [currentQuest.from.coords.longitude, currentQuest.from.coords.latitude],
                ...deliveryStack.map((stack) => [stack.coords.longitude, stack.coords.latitude])
            ];
            map.current.addSource(lineId, {
                type: "geojson",
                data: {
                    type: "Feature",
                    properties: {},
                    geometry: {
                        type: "LineString",
                        coordinates: lineCoordinates,
                    },
                },
            });
            map.current.addLayer({
                id: lineId,
                type: "line",
                source: lineId,
                layout: {
                    "line-join": "round",
                    "line-cap": "round",
                },
                paint: {
                    "line-color": "#ff0000",
                    "line-width": 4,
                    "line-opacity": 0.7,
                },
            });
        }

        // クリーンアップ関数を返す
        return () => {
            // クリーンアップで中継地点マーカーを削除
            document.querySelectorAll(".relay-marker").forEach((el) => el.remove());
        };
    }, [deliveryStack, currentQuest, gamePhase]);

    return (
        <div className="w-full h-screen relative">
            {/* ゲーム開始画面（ゲーム未開始の場合） */}
            {!isGameStarted && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <GameStartComponent />
                </div>
            )}

            {/* 左上の年度選択UI */}
            <div className="absolute top-4 left-4 bg-white bg-opacity-90 rounded-lg shadow-md p-4 z-10" style={{ minWidth: "200px" }}>
                <div className="font-bold mb-2">年度選択</div>
                <select value={currentYear} onChange={(e) => setCurrentYear(e.target.value)} className="w-full p-2 border border-gray-300 rounded">
                    {availableYears.map((year) => (
                        <option key={year} value={year}>
                            {year}年
                        </option>
                    ))}
                </select>
                <div className="text-sm text-gray-600 mt-1">現在: {currentYear}年のルートデータ</div>
            </div>

            {/* 右上の情報表示UIをここに追加 */}
            <div className="absolute top-4 right-4 bg-white bg-opacity-90 rounded-lg shadow-md p-4 z-10" style={{ minWidth: "200px" }}>
                <div className="font-bold mb-2">ルート情報</div>
                <div className="flex flex-col gap-1 text-sm">
                    <div>
                        距離：<span className="font-semibold">{deliveryResult.distance.toFixed(1)} km</span>
                    </div>
                    <div>
                        ガソリン消費量：<span className="font-semibold">{deliveryResult.gasolineConsumption.toFixed(2)} L</span>
                    </div>
                    <div>
                        CO₂排出量：<span className="font-semibold">{deliveryResult.co2Emission.toFixed(2)} kg</span>
                    </div>
                </div>
            </div>

            {/* 左下にサイコロコンポーネント */}
            {isGameStarted && (
                <div className="absolute bottom-4 left-4 z-10">
                    <DiceComponent />
                </div>
            )}

            {/* 右下にプレイヤー情報 */}
            {isGameStarted && (
                <div className="absolute bottom-4 right-4 z-10">
                    <PlayerInfoComponent />
                </div>
            )}

            {/* 中央下にクエスト情報 */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
                <QuestInfoComponent />
            </div>

            <div ref={mapContainer} className="w-full h-full" />
        </div>
    );
};

export default ClickToAddPinMap;
