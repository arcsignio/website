/**
 * ArcSign Wallet WebSocket Client
 *
 * Connects to ArcSign Wallet via WebSocket (ws://127.0.0.1:9527)
 * for transaction signing.
 *
 * Design: On-demand connection (no auto-reconnect, no persistent connection)
 * - Connect only when user initiates an action
 * - Disconnect after transaction completes or is cancelled
 * - Allow cancellation of pending requests
 */

export interface WsRequest {
  id: number;
  method: 'ping' | 'get_accounts' | 'get_balance' | 'sign_transaction' | 'sign_and_broadcast';
  params?: Record<string, unknown>;
}

export interface WsResponse {
  id: number;
  success: boolean;
  result?: unknown;
  error?: string;
}

export interface SignTransactionParams {
  from: string;
  to: string;
  data: string;
  value?: string;
  gas?: string;
  gasPrice?: string;
  chainId?: number;
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export class ArcSignClient {
  private ws: WebSocket | null = null;
  private requestId = 0;
  private pendingRequests = new Map<number, {
    resolve: (response: WsResponse) => void;
    reject: (error: Error) => void;
    timeout: ReturnType<typeof setTimeout>;
  }>();
  private statusListeners = new Set<(status: ConnectionStatus) => void>();
  private _status: ConnectionStatus = 'disconnected';
  private _currentRequestId: number | null = null; // Track current pending request

  readonly WS_URL = 'ws://127.0.0.1:9527';

  get status(): ConnectionStatus {
    return this._status;
  }

  get hasPendingRequest(): boolean {
    return this._currentRequestId !== null;
  }

  private setStatus(status: ConnectionStatus) {
    this._status = status;
    this.statusListeners.forEach(listener => listener(status));
  }

  onStatusChange(listener: (status: ConnectionStatus) => void) {
    this.statusListeners.add(listener);
    return () => this.statusListeners.delete(listener);
  }

  async connect(): Promise<boolean> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return true;
    }

    this.setStatus('connecting');

    return new Promise((resolve) => {
      try {
        this.ws = new WebSocket(this.WS_URL);

        this.ws.onopen = () => {
          console.log('ArcSign Wallet connected');
          this.setStatus('connected');
          resolve(true);
        };

        this.ws.onclose = () => {
          console.log('ArcSign Wallet disconnected');
          this.setStatus('disconnected');
          // No auto-reconnect - connection is on-demand only
          this.cancelAllPendingRequests('Connection closed');
        };

        this.ws.onerror = (error) => {
          console.error('ArcSign Wallet error:', error);
          this.setStatus('error');
          resolve(false);
        };

        this.ws.onmessage = (event) => {
          try {
            const response: WsResponse = JSON.parse(event.data);
            const pending = this.pendingRequests.get(response.id);
            if (pending) {
              clearTimeout(pending.timeout);
              this.pendingRequests.delete(response.id);
              if (this._currentRequestId === response.id) {
                this._currentRequestId = null;
              }
              pending.resolve(response);
            }
          } catch (e) {
            console.error('Failed to parse response:', e);
          }
        };

        // Timeout after 3 seconds
        setTimeout(() => {
          if (this._status === 'connecting') {
            this.setStatus('error');
            resolve(false);
          }
        }, 3000);

      } catch (e) {
        console.error('Failed to connect:', e);
        this.setStatus('error');
        resolve(false);
      }
    });
  }

  disconnect() {
    this.cancelAllPendingRequests('Disconnected by user');
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  /**
   * Cancel the current pending transaction request
   */
  cancelCurrentRequest(): boolean {
    if (this._currentRequestId !== null) {
      const pending = this.pendingRequests.get(this._currentRequestId);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(this._currentRequestId);
        pending.resolve({
          id: this._currentRequestId,
          success: false,
          error: 'Request cancelled by user',
        });
        this._currentRequestId = null;
        return true;
      }
    }
    return false;
  }

  /**
   * Cancel all pending requests
   */
  private cancelAllPendingRequests(reason: string) {
    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.resolve({
        id,
        success: false,
        error: reason,
      });
    }
    this.pendingRequests.clear();
    this._currentRequestId = null;
  }

  private async send(request: WsRequest, timeoutMs: number = 60000): Promise<WsResponse> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      const connected = await this.connect();
      if (!connected) {
        return {
          id: request.id,
          success: false,
          error: 'Not connected to ArcSign Wallet. Please open the wallet application.',
        };
      }
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(request.id);
        if (this._currentRequestId === request.id) {
          this._currentRequestId = null;
        }
        resolve({
          id: request.id,
          success: false,
          error: 'Request timeout',
        });
      }, timeoutMs);

      this.pendingRequests.set(request.id, {
        resolve: (response) => {
          resolve(response);
        },
        reject: () => {
          // Not used but kept for interface compatibility
        },
        timeout,
      });

      this.ws!.send(JSON.stringify(request));
    });
  }

  async ping(): Promise<boolean> {
    const response = await this.send({
      id: ++this.requestId,
      method: 'ping',
    });
    return response.success;
  }

  async getAccounts(): Promise<{ accounts: string[]; chainId: number } | null> {
    const response = await this.send({
      id: ++this.requestId,
      method: 'get_accounts',
    });

    if (response.success && response.result) {
      return response.result as { accounts: string[]; chainId: number };
    }

    console.error('Failed to get accounts:', response.error);
    return null;
  }

  async getBalance(address: string, token: string = 'BNB'): Promise<string | null> {
    const response = await this.send({
      id: ++this.requestId,
      method: 'get_balance',
      params: { address, token },
    });

    if (response.success && response.result) {
      const result = response.result as { balance: string };
      return result.balance;
    }

    return null;
  }

  async signTransaction(params: SignTransactionParams): Promise<WsResponse> {
    const reqId = ++this.requestId;
    this._currentRequestId = reqId;
    return this.send({
      id: reqId,
      method: 'sign_transaction',
      params: {
        from: params.from,
        to: params.to,
        data: params.data,
        value: params.value || '0x0',
        gas: params.gas,
        gas_price: params.gasPrice,
        chain_id: params.chainId || 56,
      },
    });
  }

  async signAndBroadcast(params: SignTransactionParams): Promise<WsResponse> {
    const reqId = ++this.requestId;
    this._currentRequestId = reqId;
    return this.send({
      id: reqId,
      method: 'sign_and_broadcast',
      params: {
        from: params.from,
        to: params.to,
        data: params.data,
        value: params.value || '0x0',
        gas: params.gas,
        gas_price: params.gasPrice,
        chain_id: params.chainId || 56,
      },
    });
  }
}

// Singleton instance
export const arcSignClient = new ArcSignClient();
