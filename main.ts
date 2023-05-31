

//% block="jac:stack"
//% color="#a0b4d2"
namespace pxt_jac_stack {

    enum FixType {
        NONE = -1,
        FIX_2D,
        FIX_3D
    };

    let _serialBuffer = "";
    let _seenUpdate = false
    let _i2cAddress = 0x10; // Default for the MTK3339 'Ultimate GPS' module
    let _uartBaud = 9600;
    let _uartTx = SerialPin.P1;
    let _uartRx = SerialPin.P0;

    //% block="set jac:stack i2c address to $address"
    //% advanced=true
    export function setI2CAddress( address: number ): void {
        _i2cAddress = address;
    }

    //% block="set jac:stack serial pins to $tx and $rx"
    //% advanced=true
    export function setSerialPins( tx: SerialPin = SerialPin.P1, rx: SerialPin = SerialPin.P0 ): void {
        _uartTx = tx;
        _uartRx = rx;
    }

    //% block="enable tracking $automatic"
    //% group="control"
    export function setAutoUpdates( automatic: boolean = true ): void {
        if( automatic ) {
            serial.redirect(_uartTx, _uartRx, _uartBaud);
            serial.onDataReceived("\n", parseBuffer)
            return;
        }

        serial.redirectToUSB()
        serial.setBaudRate(115200);
    }

    // This should block until we get a location message from the radio - note that it doesn't
    // guarantee that there's a valid fix!
    //
    //% block="update my location"
    //% group="location"
    export function updateLocation(): void {
        //
    }

    //% block="location accuracy"
    //% group="location"
    export function gpsAccuracy(): FixType {
        return FixType.NONE;
    }

    //% block="GPS latitude"
    //% group="location"
    export function gpsLatitude(): number {
        return 0;
    }

    //% block="GPS longitude"
    //% group="location"
    export function gpsLongitude(): number {
        return 0;
    }

    //% block="GPS altitude"
    //% group="location"
    export function gpsAltitude(): number {
        return 0;
    }

    //% block="current GPS time"
    //% group="extras"
    export function gpsTime(): number {
        return 0;
    }

    function parseBuffer() {
        _serialBuffer.concat(serial.readString())

        // Sync to the first '$' if present
        while (_serialBuffer.length > 0 && _serialBuffer.charAt(0) != '$')
            _serialBuffer = _serialBuffer.slice(1);

        // Did we actually sync on anything?
        if (_serialBuffer.charAt(0) == '$') {
            let line = _serialBuffer.split("\n")[0];
            parseNMEA(line);
            _serialBuffer = _serialBuffer.slice(line.length - 1);
        }
    }

    function parseNMEA( line: string ): void {
    }
}