enum LocationFixType {
    //% block="Offline"
    OFFLINE = 0,

    //% block="No Fix"
    NONE = 1,

    //% block="2D Fix"
    FIX_2D = 2,

    //% block="3D Fix"
    FIX_3D = 3
};

//% block="jac:stack"
//% color="#a0b4d2"
namespace pxt_jac_stack {

    let _validMessages = 0;

    let _uartBaud = 9600;
    let _uartTx = EdgeSerialPin.P0;
    let _uartRx = EdgeSerialPin.P8;

    let _updateHandler: Array<() => void> = [];
    let _nmeaDataHandler: Array<(x:string) => void> = [];

    // Set the default JacStack pins
    edgeserial.redirect( _uartTx, _uartRx, _uartBaud );
    edgeserial.setRxBufferSize( 128 );

    edgeserial.onDataReceived(String.fromCharCode(Delimiters.NewLine), () => {
        try {
            let readline = edgeserial.readUntil(String.fromCharCode(Delimiters.NewLine));
            if (readline.length > 0)
                parseNMEA(readline);
        } catch (err) {
            // Ignore any transient read errors
        }
    } );

    let location = {
        datetime: {
            hour: 0,
            minute: 0,
            second: 0,
            year: 0,
            month: 0,
            day: 0
        },
        latitude: 0,
        longitude: 0,
        altitude: 0,
        speedOverGround: 0,
        courseOverGround: 0,
        fixType: LocationFixType.NONE,
        satellites: 0
    }

    //% block="on gps location update"
    //% group="GPS Location"
    export function onLocationUpdate( handler: () => void ): void {
        _updateHandler.push( handler );
    }

    //% block="on NMEA data $data"
    //% group="Debugging"
    //% draggableParameters="reporter"
    //% advanced="true"
    export function onNMEAUpdate(handler: (data:string) => void): void {
        _nmeaDataHandler.push( handler );
    }
    
    //% block="set jac:stack serial pins to tx: $tx and rx: $rx"
    //% advanced=true
    export function setSerialPins(tx: EdgeSerialPin = EdgeSerialPin.P1, rx: EdgeSerialPin = EdgeSerialPin.P0 ): void {
        _uartTx = tx;
        _uartRx = rx;
        edgeserial.redirect(_uartTx, _uartRx, _uartBaud)
    }

    //% block="enable tracking $automatic"
    //% group="Control"
    /*export function setAutoUpdates( automatic: boolean = true ): void {
        if( automatic ) {
            serial.redirect(_uartTx, _uartRx, _uartBaud);
            serial.setRxBufferSize( 128 );
            _monitorEnable = true;
            return;
        }

        serial.redirectToUSB();
        serial.setBaudRate(115200);
        _monitorEnable = false;
    }*/

    //% block="latitude"
    //% group="GPS Location"
    export function getLatitude(): number {
        return location.latitude;
    }

    //% block="longitude"
    //% group="GPS Location"
    export function getLongitude(): number {
        return location.longitude;
    }

    //% block="altitude"
    //% group="GPS Location"
    export function getAltitude(): number {
        return location.altitude;
    }

    //% block="ground speed"
    //% group="GPS Movement"
    export function getGroundSpeed(): number {
        return location.speedOverGround;
    }

    //% block="ground direction"
    //% group="GPS Movement"
    export function getCourse(): number {
        return location.courseOverGround;
    }

    //% block="satellites"
    //% group="GPS Info"
    export function getSatellites(): number {
        return location.satellites;
    }

    //% block="gps status"
    //% group="GPS Info"
    export function getFix(): LocationFixType {
        return location.fixType;
    }

    //% block="$t"
    //% group="GPS Info"
    export function getFixProxy( t: LocationFixType = LocationFixType.NONE ): LocationFixType {
        return t;
    }

    //% block="$v as long float number, to $precision decimal places"
    //% advanced="true"
    export function toLongFloatString( v: number, precision: number = 8 ): string {
        let buffer = `${Math.floor(v)}.`
        let remainder = v - Math.floor(v);
        for( let i=0; i<precision; i++ ) {
            buffer += `${Math.floor(remainder * 10)}`;
            remainder = (remainder * 10) - Math.floor(remainder * 10);
        }
        return buffer;
    }

    //% block="has gps fix"
    //% group="GPS Info"
    export function hasFix(): boolean {
        return location.fixType > LocationFixType.NONE;
    }

    //% block="hour"
    //% group="GPS Time and Date"
    export function getHour(): number {
        return location.datetime.hour;
    }

    //% block="minute"
    //% group="GPS Time and Date"
    export function getMinute(): number {
        return location.datetime.minute;
    }

    //% block="second"
    //% group="GPS Time and Date"
    export function getSecond(): number {
        return location.datetime.second;
    }

    //% block="day"
    //% group="GPS Time and Date"
    export function getDay(): number {
        return location.datetime.day;
    }

    //% block="month"
    //% group="GPS Time and Date"
    export function getMonth(): number {
        return location.datetime.month;
    }

    //% block="year"
    //% group="GPS Time and Date"
    export function getYear(): number {
        return location.datetime.year;
    }

    //% block="valid messages"
    //% advanced="true"
    export function getValidMessages(): number {
        return _validMessages;
    }

    function parseNMEA(input: string): void {
        _nmeaDataHandler.forEach((cb) => {
            try { cb(input); } catch (err) { /* ... */ }
        });
        let msg = input.split(",");
        switch (msg[0]) {
            case "$GPGGA":
            case "$GNGGA":
                parseGPGGA(msg);
                _updateHandler.forEach( (cb) => {
                    try { cb(); } catch( err ){ /* ... */ }
                });
                break;
            
            case "$GPGSA":
            case "$GNGSA":
                location.fixType = parseInt(msg[2]);
                break;

            case "$GPRMC":
            case "$GNRMC":
                parseGPRMC(msg);
                _updateHandler.forEach((cb) => {
                    try { cb(); } catch (err) { /* ... */ }
                });
                break;
            
            default:
                // Skip
        }
    }

    function parseGPRMC(msg: string[]): void {
        if (msg[2] == 'A') {
            location.datetime.hour = parseInt(msg[1].slice(0, 2));
            location.datetime.minute = parseInt(msg[1].slice(2, 4));
            location.datetime.second = parseInt(msg[1].slice(4));
            location.datetime.year = parseInt(msg[9].slice(4, 6));
            location.datetime.month = parseInt(msg[9].slice(2, 4));
            location.datetime.day = parseInt(msg[9].slice(0, 2));

            location.speedOverGround = parseFloat(msg[7]) * 0.514444;
            location.courseOverGround = parseFloat(msg[8]);
            return;
        }
        location.datetime.hour = 0;
        location.datetime.minute = 0;
        location.datetime.second = 0;
        location.datetime.year = 0;
        location.datetime.month = 0;
        location.datetime.day = 0;

        location.speedOverGround = 0;
        location.courseOverGround = 0;

        _validMessages = _validMessages + 1;
    }

    function parseGPGGA(msg: string[]): void {
        if (msg.length != 15)
            return;

        location.latitude = computeLatitude(msg[2], msg[3]);
        location.longitude = computeLongitude(msg[4], msg[5]);
        location.altitude = parseFloat(msg[9]);

        // Catch NaN's so we don't blow up folks code later...
        if (location.latitude == NaN)
            location.latitude = 0;
        if (location.longitude == NaN)
            location.longitude = 0;
        if (location.altitude == NaN)
            location.altitude = 0;

        location.satellites = parseInt(msg[7]);

        _validMessages = _validMessages + 1;
    }

    function computeLatitude(input: string, ns: string): number {
        if (input.length < 4)
            return 0;
        let d = parseInt(input.slice(0, 2));
        let m = parseFloat(input.slice(2)) / 60;
        if (ns.toUpperCase() == "S")
            return (d + m) * -1;
        return (d + m);
    }

    function computeLongitude(input: string, ew: string): number {
        if (input.length < 4)
            return 0;
        let d = parseInt(input.slice(0, 3));
        let m = parseFloat(input.slice(3)) / 60;
        if (ew.toUpperCase() == "W")
            return (d + m) * -1;
        return (d + m);
    }
}