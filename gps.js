const EARTH_RADIUS_KM = 6371;
const NAUTICAL_MILE_M = 1852;

function deg_to_rad(deg) {
    return deg * Math.PI / 180;
}

function rad_to_deg(rd) {
    return rd * 180 / Math.PI;
}

class GPSCoordinates {
    constructor(latitude, longitude) { this.latitude = latitude; this.longitude = longitude; }

    movebytime(heading, groundspeed, dt_s) {
        const groundspeed_mps = (groundspeed * NAUTICAL_MILE_M / (60 * 60));
        if (groundspeed_mps == Infinity || groundspeed_mps == -Infinity) { groundspeed_mps = 0 }
        const distance_m = groundspeed_mps * dt_s;
        this.move(heading, distance_m);
    }

    move(heading, distance_m) {
        if (distance_m == 0) {
            return;
        }
        const heading_rad = deg_to_rad(heading);
        const dx = Math.cos(heading_rad) * distance_m;
        const dy = Math.sin(heading_rad) * distance_m;
        const dlat_rad = dx / (EARTH_RADIUS_KM * 1000);
        const dlng_rad = dy / (EARTH_RADIUS_KM * 1000 * Math.cos(deg_to_rad(this.latitude)));

        const latitude = (this.latitude + rad_to_deg(dlat_rad));
        const longitude = (this.longitude + rad_to_deg(dlng_rad));

        this.latitude = latitude;
        this.longitude = longitude;
    }

    distance_to(gpscoord) {
        const lat1_rad = deg_to_rad(this.latitude);
        const lat2_rad = deg_to_rad(gpscoord.latitude);
        const lng1_rad = deg_to_rad(this.longitude);
        const lng2_rad = deg_to_rad(gpscoord.longitude);
        return Math.acos(Math.sin(lat1_rad) * Math.sin(lat2_rad) +
            Math.cos(lat1_rad) * Math.cos(lat2_rad) *
            Math.cos(Math.abs(lng2_rad - lng1_rad))) * EARTH_RADIUS_KM * 1000;
    }
}

export { GPSCoordinates, deg_to_rad };