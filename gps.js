const EARTH_RADIUS_NM = 3440;

function deg_to_rad(deg) {
    return deg * Math.PI / 180;
}

function rad_to_deg(rd) {
    return rd * 180 / Math.PI;
}

class GPSCoordinates {
    constructor(latitude, longitude) { this.latitude = latitude; this.longitude = longitude; }

    movebytime(heading, groundspeed, dt_s) {
        let groundspeed_nmps = (groundspeed / (60 * 60));
        if (groundspeed_nmps == Infinity || groundspeed_nmps == -Infinity) { groundspeed_nmps = 0 }
        let distance_nm = groundspeed_nmps * dt_s;
        this.move(heading, distance_nm);
    }


    move(heading, distance_nm) {
        if (distance_nm == 0) {
            return;
        }
        let heading_rad = deg_to_rad(heading);
        let dx = Math.cos(heading_rad) * distance_nm;
        let dy = Math.sin(heading_rad) * distance_nm;
        let dlat_rad = dx / (EARTH_RADIUS_NM);
        let dlng_rad = dy / (EARTH_RADIUS_NM * Math.cos(deg_to_rad(this.latitude)));

        let latitude = (this.latitude + rad_to_deg(dlat_rad));
        let longitude = (this.longitude + rad_to_deg(dlng_rad));

        this.latitude = latitude;
        this.longitude = longitude;
    }

    distance_to(gpscoord) {
        let lat1_rad = deg_to_rad(this.latitude);
        let lat2_rad = deg_to_rad(gpscoord.latitude);
        let lng1_rad = deg_to_rad(this.longitude);
        let lng2_rad = deg_to_rad(gpscoord.longitude);
        return Math.acos(Math.sin(lat1_rad) * Math.sin(lat2_rad) +
            Math.cos(lat1_rad) * Math.cos(lat2_rad) *
            Math.cos(Math.abs(lng2_rad - lng1_rad))) * EARTH_RADIUS_NM;
    }
}