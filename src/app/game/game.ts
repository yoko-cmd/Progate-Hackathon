import { PortBuilding, StorageBuilding, PlayerState, GameState, DeliveryEvent, DeliveryResult, DeliveryMethod, DiceResult } from "./types";

export class Game {
    players: Player[];
    map: Map;
    currentPlayerIndex: number = 0;
    state: GameState = "waiting";
    currentDeliveryEvent: DeliveryEvent | null = null;

    constructor() {
        this.players = [];
        this.map = new Map();
    }

    // プレイヤーを追加
    addPlayer(name: string): string {
        const playerId = `player_${this.players.length}`;
        const player = new Player(playerId, name);
        this.players.push(player);
        return playerId;
    }

    // ゲーム開始
    startGame(): void {
        if (this.players.length < 1) {
            throw new Error("At least 1 player is required to start the game");
        }
        this.state = "playing";
        this.currentPlayerIndex = 0;
    }

    // 現在のプレイヤーを取得
    getCurrentPlayer(): Player {
        return this.players[this.currentPlayerIndex];
    }

    // ダイスを振る
    rollDice(): DiceResult {
        const value = Math.floor(Math.random() * 6) + 1;
        const currentPlayer = this.getCurrentPlayer();
        return {
            value,
            playerId: currentPlayer.id,
        };
    }

    // プレイヤーを移動
    movePlayer(steps: number): void {
        const currentPlayer = this.getCurrentPlayer();
        const newPosition = Math.min(currentPlayer.state.position + steps, this.map.storages.length - 1);

        currentPlayer.state.position = newPosition;
        currentPlayer.state.currentBuildingId = this.map.storages[newPosition].id;

        // 移動後に配送イベントを発生
        this.triggerDeliveryEvent();
    }

    // 配送イベントを発生
    triggerDeliveryEvent(): void {
        this.state = "delivery-event";
        const currentPlayer = this.getCurrentPlayer();

        // ランダムな目的地を選択
        const availableBuildings = this.map.getAllBuildings().filter((building) => building.id !== currentPlayer.state.currentBuildingId);
        const randomDestination = availableBuildings[Math.floor(Math.random() * availableBuildings.length)];

        this.currentDeliveryEvent = {
            fromBuildingId: currentPlayer.state.currentBuildingId,
            toBuildingId: randomDestination.id,
            cargoWeight: Math.floor(Math.random() * 1000) + 100, // 100-1100kg
            cargoType: this.getRandomCargoType(),
            urgency: this.getRandomUrgency(),
        };
    }

    // 配送方法を選択して実行
    executeDelivery(method: DeliveryMethod): DeliveryResult {
        if (!this.currentDeliveryEvent) {
            throw new Error("No delivery event in progress");
        }

        const result = this.calculateDeliveryResult(this.currentDeliveryEvent, method);
        const currentPlayer = this.getCurrentPlayer();

        // プレイヤーの状態を更新
        currentPlayer.state.co2Point += result.co2Emission;
        currentPlayer.state.money -= result.cost;
        currentPlayer.state.completedDeliveries += 1;

        // 効率的な配送にボーナス
        if (this.isOptimalDeliveryMethod(this.currentDeliveryEvent, method)) {
            currentPlayer.state.deliveryCredit += 10;
        }

        this.currentDeliveryEvent = null;
        this.nextTurn();

        return result;
    }

    // 次のターンに移行
    nextTurn(): void {
        this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
        this.state = "playing";

        // ゲーム終了条件をチェック
        if (this.checkGameEnd()) {
            this.state = "finished";
        }
    }

    // ゲーム終了判定
    private checkGameEnd(): boolean {
        return this.players.some((player) => player.state.position >= this.map.storages.length - 1);
    }

    // 配送結果を計算
    calculateDeliveryResult(event: DeliveryEvent, method: DeliveryMethod): DeliveryResult {
        const fromBuilding = this.map.getBuildingById(event.fromBuildingId);
        const toBuilding = this.map.getBuildingById(event.toBuildingId);
        const distance = this.map.calculateDistance(fromBuilding, toBuilding);

        let co2Emission: number;
        let cost: number;
        let days: number;

        switch (method) {
            case "truck":
                co2Emission = (distance * 0.1 * event.cargoWeight) / 1000; // kg CO2
                cost = distance * 50 + event.cargoWeight * 2; // 円
                days = Math.ceil(distance / 500); // 500km/day
                break;
            case "ship":
                co2Emission = (distance * 0.03 * event.cargoWeight) / 1000; // kg CO2
                cost = distance * 20 + event.cargoWeight * 1; // 円
                days = Math.ceil(distance / 200); // 200km/day
                break;
            case "air":
                co2Emission = (distance * 0.5 * event.cargoWeight) / 1000; // kg CO2
                cost = distance * 200 + event.cargoWeight * 10; // 円
                days = 1; // 1日
                break;
        }

        return {
            success: true,
            co2Emission: Math.round(co2Emission),
            cost: Math.round(cost),
            days: Math.max(1, days),
            method,
            distance: Math.round(distance),
        };
    }

    // 最適な配送方法かチェック
    private isOptimalDeliveryMethod(event: DeliveryEvent, method: DeliveryMethod): boolean {
        const fromBuilding = this.map.getBuildingById(event.fromBuildingId);
        const toBuilding = this.map.getBuildingById(event.toBuildingId);

        // 港間の配送は船が最適
        if (fromBuilding.type === "port" && toBuilding.type === "port") {
            return method === "ship";
        }

        // 緊急度が高い場合は航空便が最適
        if (event.urgency === "high") {
            return method === "air";
        }

        // その他の場合はトラックが最適
        return method === "truck";
    }

    private getRandomCargoType(): string {
        const cargoTypes = ["食品", "電子機器", "衣類", "機械部品", "化学製品"];
        return cargoTypes[Math.floor(Math.random() * cargoTypes.length)];
    }

    private getRandomUrgency(): "low" | "medium" | "high" {
        const urgencies: ("low" | "medium" | "high")[] = ["low", "medium", "high"];
        return urgencies[Math.floor(Math.random() * urgencies.length)];
    }
}

class Player {
    id: string;
    name: string;
    state: PlayerState;

    constructor(id: string, name: string) {
        this.id = id;
        this.name = name;
        this.state = {
            currentBuildingId: 0,
            position: 0,
            co2Point: 0,
            money: 10000, // 初期資金
            deliveryCredit: 0,
            completedDeliveries: 0,
        };
    }

    toString(): string {
        return JSON.stringify({
            id: this.id,
            name: this.name,
            state: this.state,
        });
    }

    fromString(data: string): void {
        const parsed = JSON.parse(data);
        this.id = parsed.id;
        this.name = parsed.name;
        this.state = parsed.state;
    }
}

class Map {
    ports: PortBuilding[];
    storages: StorageBuilding[];
    storageNodes: number[][]; // 2D array representing storage nodes

    constructor() {
        this.ports = [];
        this.storages = [];
        this.storageNodes = [];
        this.initializeJapanMap();
    }

    // 日本地図の初期化
    private initializeJapanMap(): void {
        // 主要な港を追加
        this.ports = [
            { id: 1, name: "横浜港", type: "port", coords: { latitude: 35.4437, longitude: 139.638 } },
            { id: 2, name: "神戸港", type: "port", coords: { latitude: 34.6851, longitude: 135.1706 } },
            { id: 3, name: "名古屋港", type: "port", coords: { latitude: 35.0844, longitude: 136.8849 } },
            { id: 4, name: "博多港", type: "port", coords: { latitude: 33.606, longitude: 130.3978 } },
            { id: 5, name: "仙台港", type: "port", coords: { latitude: 38.2682, longitude: 141.0203 } },
        ];

        // 物流拠点（倉庫）を追加
        this.storages = [
            { id: 11, name: "札幌物流センター", type: "storage", coords: { latitude: 43.0642, longitude: 141.3469 } },
            { id: 12, name: "仙台物流センター", type: "storage", coords: { latitude: 38.2682, longitude: 141.0203 } },
            { id: 13, name: "東京物流センター", type: "storage", coords: { latitude: 35.6762, longitude: 139.6503 } },
            { id: 14, name: "横浜物流センター", type: "storage", coords: { latitude: 35.4437, longitude: 139.638 } },
            { id: 15, name: "名古屋物流センター", type: "storage", coords: { latitude: 35.1815, longitude: 136.9066 } },
            { id: 16, name: "大阪物流センター", type: "storage", coords: { latitude: 34.6937, longitude: 135.5023 } },
            { id: 17, name: "神戸物流センター", type: "storage", coords: { latitude: 34.6851, longitude: 135.1706 } },
            { id: 18, name: "広島物流センター", type: "storage", coords: { latitude: 34.3853, longitude: 132.4553 } },
            { id: 19, name: "福岡物流センター", type: "storage", coords: { latitude: 33.606, longitude: 130.3978 } },
            { id: 20, name: "鹿児島物流センター", type: "storage", coords: { latitude: 31.5604, longitude: 130.5581 } },
        ];
    }

    // 建物をIDで取得
    getBuildingById(id: number): PortBuilding | StorageBuilding {
        const building = this.getAllBuildings().find((b) => b.id === id);
        if (!building) {
            throw new Error(`Building with id ${id} not found`);
        }
        return building;
    }

    // すべての建物を取得
    getAllBuildings(): (PortBuilding | StorageBuilding)[] {
        return [...this.ports, ...this.storages];
    }

    // 2点間の距離を計算（km）
    calculateDistance(from: PortBuilding | StorageBuilding, to: PortBuilding | StorageBuilding): number {
        const R = 6371; // 地球の半径 (km)
        const dLat = this.toRadians(to.coords.latitude - from.coords.latitude);
        const dLon = this.toRadians(to.coords.longitude - from.coords.longitude);

        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRadians(from.coords.latitude)) * Math.cos(this.toRadians(to.coords.latitude)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private toRadians(degrees: number): number {
        return degrees * (Math.PI / 180);
    }
}
