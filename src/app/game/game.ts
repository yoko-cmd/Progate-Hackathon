import { PortBuilding, StorageBuilding } from "./types";

export class Game {
    players: Player[];
    map: Map;

    constructor() {
        this.players = [];
        this.map = new Map();
    }
}

class Player {
    currentStorageIndex: number = 0;
    co2Point: number = 0;
    money: number = 0;
    deliveryCredit: number = 0;

    toString() {}
    fromString() {}
}

class Map {
    ports: PortBuilding[];
    storages: StorageBuilding[];
    storageNodes: number[][]; // 2D array representing storage nodes

    constructor() {
        this.ports = [];
        this.storages = [];
        this.storageNodes = [];
    }
}
