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

    let _monitorEnable = false;
    let _uartBaud = 9600;
    let _uartTx = SerialPin.P1;
    let _uartRx = SerialPin.P0;

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
            serial.setRxBufferSize( 128 );
            _monitorEnable = true;
            return;
        }

        serial.redirectToUSB();
        serial.setBaudRate(115200);
        _monitorEnable = false;
    }

    //% block="latitude"
    //% group="GPS Location"
    function getLatitude(): number {
        return location.latitude;
    }

    //% block="longitude"
    //% group="GPS Location"
    function getLongitude(): number {
        return location.longitude;
    }

    //% block="altitude"
    //% group="GPS Location"
    function getAltitude(): number {
        return location.altitude;
    }

    //% block="ground speed"
    //% group="GPS Movement"
    function getGroundSpeed(): number {
        return location.speedOverGround;
    }

    //% block="ground direction"
    //% group="GPS Movement"
    function getCourse(): number {
        return location.courseOverGround;
    }

    //% block="satellites"
    //% group="GPS Statistics"
    function getSatellites(): number {
        return location.satellites;
    }

    //% block="satellites"
    //% group="GPS Statistics"
    function getFix(): LocationFixType {
        return location.fixType;
    }

    control.runInBackground(() => {
        while (true) {
            if (_monitorEnable) {
                let readline = serial.readLine()
                if (readline.length > 0)
                    parseNMEA(readline);

                pause(5);
            }
            else
                pause(200);
        }
    });

    function parseNMEA(input: string): void {
        let msg = input.split(",");

        switch (msg[0]) {
            case "$GPGGA": parseGPGGA(msg); break;
            case "$GPGSA": location.fixType = parseInt(msg[2]); break;
            case "$GPRMC": parseGPRMC(msg); break;
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
    }

    function parseGPGGA(msg: string[]): void {
        if (msg.length != 15)
            return;

        location.latitude = computeLatitude(msg[2], msg[3]);
        location.longitude = computeLongitude(msg[4], msg[5]);

        // Catch NaN's so we don't blow up folks code later...
        if (location.latitude == NaN)
            location.latitude = 0;
        if (location.longitude == NaN)
            location.longitude = 0;

        location.satellites = parseInt(msg[7]);
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