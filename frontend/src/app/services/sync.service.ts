import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SyncService {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private incoming$ = new Subject<any>();

  isAvailable(): boolean {
    return typeof navigator !== 'undefined' && !!(navigator as any).bluetooth;
  }

  async requestDevice(options?: RequestDeviceOptions): Promise<BluetoothDevice> {
    if (!this.isAvailable()) throw new Error('Web Bluetooth no está disponible en este navegador');
    this.device = await (navigator as any).bluetooth.requestDevice(options || { acceptAllDevices: true });
    return this.device as BluetoothDevice;
  }

  async connect(): Promise<void> {
    if (!this.device) throw new Error('No device selected');
    this.server = await (this.device as any).gatt.connect();
  }

  async sendJSON(serviceUuid: string, characteristicUuid: string, payload: any): Promise<void> {
    if (!this.server) throw new Error('Not connected');
    const service = await this.server.getPrimaryService(serviceUuid);
    const char = await service.getCharacteristic(characteristicUuid);
    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(payload));
    await char.writeValue(data);
  }

  async startNotifications(serviceUuid: string, characteristicUuid: string) {
    if (!this.server) throw new Error('Not connected');
    const service = await this.server.getPrimaryService(serviceUuid);
    const char = await service.getCharacteristic(characteristicUuid);
    await char.startNotifications();
    char.addEventListener('characteristicvaluechanged', (ev: any) => {
      const value = ev.target.value;
      const decoder = new TextDecoder();
      const raw = decoder.decode(value);
      try {
        const json = JSON.parse(raw);
        this.incoming$.next(json);
      } catch (e) {
        console.warn('No JSON payload received');
      }
    });
  }

  onMessage(): Observable<any> {
    return this.incoming$.asObservable();
  }
}
