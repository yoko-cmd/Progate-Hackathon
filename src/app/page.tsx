/* eslint-disable @typescript-eslint/no-explicit-any */
// page.tsx (修正後)

"use client";

import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";

// Font Awesomeのインポートを追加
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faIndustry } from "@fortawesome/free-solid-svg-icons";
import { renderToStaticMarkup } from "react-dom/server";

// GeoJSONデータのインポート
import geojson from "./point.json";

// import {
//   CalculateRouteCommand,
//   ResourceNotFoundException,
//   LocationClient,
//   TravelMode,
//   DistanceUnit,
// } from "@aws-sdk/client-location";

import {
  GeoRoutesClient,
  CalculateRoutesCommand,
  CalculateRoutesCommandInput
} from "@aws-sdk/client-geo-routes";

import { withAPIKey } from "@aws/amazon-location-utilities-auth-helper";

// ピンデータを管理するためのインターフェース
interface MarkerData {
  id: string;
  coordinates: [number, number];
  timestamp: Date;
  markerInstance: maplibregl.Marker;
}

// 2点の緯度・経度から直線距離を計算する関数（ヒューバーシンの公式）
// const haversineDistance = (coords1: [number, number], coords2: [number, number]) => {
//     const toRad = (x: number) => (x * Math.PI) / 180;

//     const lat1 = coords1[1];
//     const lon1 = coords1[0];
//     const lat2 = coords2[1];
//     const lon2 = coords2[0];

//     const R = 6371; // 地球の半径（km）
//     const dLat = toRad(lat2 - lat1);
//     const dLon = toRad(lon2 - lon1);
//     const a =
//         Math.sin(dLat / 2) * Math.sin(dLat / 2) +
//         Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
//         Math.sin(dLon / 2) * Math.sin(dLon / 2);
//     const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
//     const distance = R * c;

//     return distance;
// };

const ClickToAddPinMap: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [isAddingMode, setIsAddingMode] = useState(true);
  // 新しい状態を追加: 距離計算用の2つのピン
  const [selectedPins, setSelectedPins] = useState<MarkerData[]>([]);
  const [distance, setDistance] = useState<number | null>(null);
  const region = "us-east-1";
  const authHelper = withAPIKey(process.env.NEXT_PUBLIC_AWS_LOCATION_API_KEY!, "us-east-1");
  const locationClient = new GeoRoutesClient(authHelper.getClientConfig());

  // const ClickToAddPinMap: React.FC = () => {
  //   const mapContainer = useRef<HTMLDivElement>(null);
  //   const map = useRef<maplibregl.Map | null>(null);
  //   const [markers, setMarkers] = useState<MarkerData[]>([]);
  //   const [isAddingMode, setIsAddingMode] = useState(true);
  //   const [selectedPins, setSelectedPins] = useState<MarkerData[]>([]);
  //   const [distance, setDistance] = useState<number | null>(null);

  const haversineDistance = async (coords1: [number, number], coords2: [number, number]) => {
    // const routeCalcParams: CalculateRoutesCommandInput = {
    //   CalculatorName: `aaa`,
    //   DeparturePosition: coords1,
    //   DestinationPosition: coords2,
    //   TravelMode: "Car",
    //   DistanceUnit: "Kilometers",
    // };
    const routeCalcParams: CalculateRoutesCommandInput = {
      TravelMode: "Car",
      Destination: coords1,
      Origin: coords2
    };
    try {
      const command = new CalculateRoutesCommand(routeCalcParams); // ← 修正済み
      const response = await locationClient.send(command);

      console.log(
        "Successfully calculated route. The distance in kilometers is : ",
        response
      );

      setDistance(response.Routes![0].Summary?.Distance ?? null);
    } catch (caught: any) {
      if (caught.name === "ResourceNotFoundException") {
        console.error("ルート計算リソースが見つかりません:", caught.message);
      } else {
        console.error("Unexpected error:", caught);
      }
    }
  };

  // ✅ removeMarker を window に登録
  useEffect(() => {
    (window as any).removeMarker = (markerId: string) => {
      setMarkers((prev) => {
        const markerToRemove = prev.find((marker) => marker.id === markerId);
        if (markerToRemove) {
          markerToRemove.markerInstance.remove();
        }
        return prev.filter((marker) => marker.id !== markerId);
      });
    };
  }, []);

  // ✅ マップ初期化
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

        // GeoJSON のマーカー追加
        geojson.features.forEach((feature) => {
          const iconHtml = renderToStaticMarkup(
            <FontAwesomeIcon icon={faIndustry} style={{ color: "#fb6aaeff", fontSize: "30px" }} />
          );
          const el = document.createElement("div");
          el.innerHTML = iconHtml;
          el.style.transform = "translate(-50%, -100%)";

          // const message = feature.properties?.name || `ピン #${index + 1}`;
          el.addEventListener("click", () => {
            // window.alert(`GeoJSONピン: ${message}`);
          });

          new maplibregl.Marker({ element: el })
            .setLngLat(feature.geometry.coordinates as [number, number])
            .addTo(map.current!);
        });

        // クリックでピン追加
        map.current.on("click", (e) => {
          if (!isAddingMode) return;

          const { lng, lat } = e.lngLat;
          const newMarker: MarkerData = {
            id: Date.now().toString(),
            coordinates: [lng, lat],
            timestamp: new Date(),
            markerInstance: null as any,
          };

          const newMarkerInstance = new maplibregl.Marker({
            color: "#FF5722",
            draggable: false,
          })
            .setLngLat([lng, lat])
            .addTo(map.current!);

          newMarker.markerInstance = newMarkerInstance;

          setSelectedPins((prev) => {
            const updatedPins = [...prev, newMarker];
            if (updatedPins.length > 2) {
              const firstPin = updatedPins.shift();
              if (firstPin) {
                firstPin.markerInstance.remove();
              }
            }
            return updatedPins;
          });

          setMarkers((prev) => [...prev, newMarker]);
        });
      });

      map.current.on("mouseenter", () => {
        if (isAddingMode) {
          map.current!.getCanvas().style.cursor = "crosshair";
        }
      });

      map.current.on("mouseleave", () => {
        map.current!.getCanvas().style.cursor = "";
      });
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [isAddingMode]);

  // ✅ ピンが2つ選ばれたら距離を計算
  useEffect(() => {
    if (selectedPins.length === 2) {
      haversineDistance(selectedPins[0].coordinates, selectedPins[1].coordinates);
    } else {
      setDistance(null);
    }
  }, [selectedPins]);

  return (
    <div className="w-full h-screen relative">
      <div ref={mapContainer} className="w-full h-full" />
      {/* コントロールUIは省略 */}
    </div>
  );
};


// const clearAllMarkers = () => {
//   markers.forEach((marker) => marker.markerInstance.remove());
//   setMarkers([]);
//   setSelectedPins([]);
//   setDistance(null);
// };

// return (
//   <div className="w-full h-screen relative">
//     <div ref={mapContainer} className="w-full h-full" />

//     {/* コントロールパネル */}
//     <div className="absolute top-4 left-4 bg-white p-4 rounded-lg shadow-lg z-10">
//       <h3 className="font-bold text-lg mb-3">ピン追加モード</h3>
//       <div className="mb-3">
//         <label className="flex items-center">
//           <input type="checkbox" checked={isAddingMode} onChange={(e) => setIsAddingMode(e.target.checked)} className="mr-2" />
//           <span className="text-sm">クリックでピン追加</span>
//         </label>
//       </div>
//       <div className="mb-3">
//         <p className="text-sm text-gray-600">追加されたピン: {markers.length}個</p>
//       </div>

//       {/* 距離表示の追加 */}
//       <div className="mb-3 p-2 bg-blue-100 rounded">
//         <h4 className="font-semibold text-blue-800">直線距離</h4>
//         {distance !== null ? (
//           <p className="text-sm text-blue-900 font-bold">{distance.toFixed(2)} km</p>
//         ) : (
//           <p className="text-sm text-blue-700">2つのピンをクリックしてください</p>
//         )}
//       </div>

//       <button onClick={clearAllMarkers} className="w-full px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm">
//         全てのピンを削除
//       </button>
//       {isAddingMode && <p className="text-xs text-blue-600 mt-2">💡 地図をクリックしてピンを追加</p>}
//     </div>

//     {/* マーカーリスト */}
//     <div className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-lg max-w-xs max-h-96 overflow-y-auto z-10">
//       <h4 className="font-bold text-sm mb-2">追加されたピン一覧</h4>
//       {markers.length === 0 ? (
//         <p className="text-xs text-gray-500">まだピンがありません</p>
//       ) : (
//         <div className="space-y-2">
//           {markers.map((marker, index) => (
//             <div key={marker.id} className="p-2 bg-gray-50 rounded text-xs">
//               <div className="font-semibold">ピン #{index + 1}</div>
//               <div className="text-gray-600">
//                 {marker.coordinates[1].toFixed(4)}, {marker.coordinates[0].toFixed(4)}
//               </div>
//               <div className="text-gray-500">{marker.timestamp.toLocaleTimeString()}</div>
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   </div>
// );

export default ClickToAddPinMap;