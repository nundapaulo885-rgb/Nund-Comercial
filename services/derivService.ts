import { TradeType } from "../types";

const APP_ID = 1089; // Public App ID for testing. For production, register your own.
const WS_URL = `wss://ws.binaryws.com/websockets/v3?app_id=${APP_ID}`;

type TickCallback = (price: number, time: number) => void;
type TradeCallback = (result: any) => void;

export class DerivService {
  private ws: WebSocket | null = null;
  private token: string;
  private onTick: TickCallback;
  private onTrade: TradeCallback;
  private pingInterval: any;

  constructor(token: string, onTick: TickCallback, onTrade: TradeCallback) {
    this.token = token;
    this.onTick = onTick;
    this.onTrade = onTrade;
  }

  connect() {
    if (this.ws) {
      this.ws.close();
    }

    this.ws = new WebSocket(WS_URL);

    this.ws.onopen = () => {
      console.log("Connected to Deriv WS");
      this.authorize();
    };

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleMessage(data);
    };

    this.ws.onerror = (error) => {
      console.error("Deriv WS Error:", error);
    };

    this.ws.onclose = () => {
      console.log("Deriv WS Closed");
      this.stopPing();
    };
  }

  private authorize() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ authorize: this.token }));
    }
  }

  private subscribeTicks() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ ticks: 'R_100', subscribe: 1 }));
      this.startPing();
    }
  }

  private startPing() {
    this.pingInterval = setInterval(() => {
        if(this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({ ping: 1 }));
        }
    }, 30000);
  }

  private stopPing() {
      if (this.pingInterval) clearInterval(this.pingInterval);
  }

  public buy(contractType: TradeType, amount: number) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Simple buy contract using parameters (Proposal + Buy in one go is complex, 
      // we use the 'buy' with parameters shortcut for Volatility 100 5 ticks)
      const req = {
        buy: 1,
        price: amount,
        parameters: {
          amount: amount,
          basis: 'stake',
          contract_type: contractType === TradeType.CALL ? 'CALL' : 'PUT',
          currency: 'USD',
          duration: 5,
          duration_unit: 't',
          symbol: 'R_100'
        }
      };
      this.ws.send(JSON.stringify(req));
    }
  }

  public disconnect() {
    this.stopPing();
    if (this.ws) {
      this.ws.close();
    }
  }

  private handleMessage(data: any) {
    if (data.error) {
      console.error("Deriv API Error:", data.error.message);
      return;
    }

    if (data.msg_type === 'authorize') {
      console.log("Authorized, subscribing to ticks...");
      this.subscribeTicks();
    }

    if (data.msg_type === 'tick') {
      const price = data.tick.quote;
      const time = data.tick.epoch * 1000;
      this.onTick(price, time);
    }

    if (data.msg_type === 'buy') {
      // Trade placed successfully
      console.log("Trade placed:", data.buy);
      // In a full implementation, we would subscribe to the proposal_open_contract to track win/loss
      // For this simplified version, we rely on the UI to show 'Pending' until we mock the result 
      // OR we can implement the proposal_open_contract subscription here.
      // For now, we pass the buy info back.
      this.onTrade(data.buy);
    }
  }
}