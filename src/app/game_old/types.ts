import { Game } from "./game";

type GeoCoords = {
    latitude: number; // 緯度
    longitude: number; // 経度
};

export interface Building {
    id: number;
    name: string;
    coords: GeoCoords;
}

export type PortBuilding = Building & {
    type: "port";
};

export type StorageBuilding = Building & {
    type: "storage";
    ArriveEvent?: (game: Game) => void;
};

// 配送手段の種類
export type DeliveryMethod = "truck" | "ship" | "air";

// 配送イベントの結果
export interface DeliveryResult {
    success: boolean;
    co2Emission: number; // CO2排出量 (kg)
    cost: number; // 配送費 (円)
    days: number; // 配送日数
    method: DeliveryMethod;
    distance: number; // 距離 (km)
}

// 配送イベントの情報
export interface DeliveryEvent {
    fromBuildingId: number;
    toBuildingId: number;
    cargoWeight: number; // 荷物の重量 (kg)
    cargoType: string; // 荷物の種類
    urgency: "low" | "medium" | "high"; // 緊急度
}

// ゲームの状態
export type GameState = "waiting" | "playing" | "delivery-event" | "finished";

// プレイヤーの状態
export interface PlayerState {
    currentBuildingId: number;
    position: number; // すごろくの位置
    co2Point: number;
    money: number;
    deliveryCredit: number;
    completedDeliveries: number;
}

// ダイス結果
export interface DiceResult {
    value: number;
    playerId: string;
}
