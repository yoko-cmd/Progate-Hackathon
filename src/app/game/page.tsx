"use client";

import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// Font Awesomeのインポートを追加
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faIndustry } from "@fortawesome/free-solid-svg-icons";
import { renderToStaticMarkup } from "react-dom/server";

// GeoJSONデータのインポート
import storagePoint from "./point.json";

const ClickToAddPinMap: React.FC = () => {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);

    const [relayMarkers, setRelayMarkers] = useState<{ lat: number; lng: number }[]>([]);

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
                if (!map.current) return;

                // GeoJSONのフィーチャをループ処理してマーカーを追加
                storagePoint.features.forEach((feature, index) => {
                    // Font AwesomeアイコンをHTML文字列に変換
                    const iconHtml = renderToStaticMarkup(<FontAwesomeIcon icon={faIndustry} style={{ color: "#fb6aaeff", fontSize: "30px" }} />);

                    // HTML要素を作成し、アイコンを挿入
                    const el = document.createElement("div");
                    el.innerHTML = iconHtml;

                    // マーカーのスタイルを調整
                    el.style.transform = "translate(-50%, -100%)"; // ピンの底辺を座標に合わせる

                    const message = feature.properties?.test || `ピン #${index + 1}`;
                    el.addEventListener("click", () => {
                        // window.alert(`GeoJSONピン: ${message}`);
                        setRelayMarkers((prev) => [...prev, { lat: feature.geometry.coordinates[1], lng: feature.geometry.coordinates[0] }]);
                    });

                    new maplibregl.Marker({ element: el }).setLngLat(feature.geometry.coordinates as [number, number]).addTo(map.current!);
                });
            });
        }

        return () => {
            if (map.current) {
                map.current.remove();
                map.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (!map.current) return;

        // 既存の中継地点マーカーをすべて削除
        document.querySelectorAll(".relay-marker").forEach((el) => el.remove());
        // 中継地点マーカーを追加
        relayMarkers.forEach((marker) => {
            const el = document.createElement("div");
            el.className = "relay-marker";
            el.style.backgroundColor = "#ff0000";
            el.style.width = "12px";
            el.style.height = "12px";
            el.style.borderRadius = "50%";
            el.style.border = "2px solid #ffffff";
            el.style.boxSizing = "border-box";
            el.style.transform = "translate(-50%, -50%)";

            new maplibregl.Marker({ element: el }).setLngLat([marker.lng, marker.lat]).addTo(map.current!);
        });

        // 中継地点を配列の若い順番から線で結ぶ
        const lineId = "relay-line";
        if (map.current.getLayer(lineId)) {
            map.current.removeLayer(lineId);
        }
        if (map.current.getSource(lineId)) {
            map.current.removeSource(lineId);
        }
        if (relayMarkers.length >= 2) {
            const lineCoordinates = relayMarkers.map((marker) => [marker.lng, marker.lat]);
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
                },
            });
        }

        return () => {
            // クリーンアップで中継地点マーカーを削除
            document.querySelectorAll(".relay-marker").forEach((el) => el.remove());
        };
    }, [relayMarkers]);

    return (
        <div className="w-full h-screen relative">
            {/* 右上の情報表示UIをここに追加 */}
            <div
                className="absolute top-4 right-4 bg-white bg-opacity-90 rounded-lg shadow-md p-4 z-10"
                style={{ minWidth: "200px" }}
            >
                <div className="font-bold mb-2">ルート情報</div>
                <div className="flex flex-col gap-1 text-sm">
                    <div>距離：<span className="font-semibold">-- km</span></div>
                    <div>ガソリン消費量：<span className="font-semibold">-- L</span></div>
                    <div>CO₂排出量：<span className="font-semibold">-- kg</span></div>
                </div>
            </div>
            <div ref={mapContainer} className="w-full h-full" />
        </div>
    );
    };

export default ClickToAddPinMap;
