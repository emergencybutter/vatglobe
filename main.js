//import Globe from 'globe.gl';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';


const loader = new GLTFLoader();
export { loader };

import { GPSCoordinates, deg_to_rad } from '/gps.js';

const EARTH_RADIUS_KM = 6371; // km
const BLOB_SIZE = 100; // km
const BOTTOM_RIGHT = document.getElementById('bottom-right');
const FOOT_IN_M = 0.3048;

function pilot_summary(pilot, lat, lng) {
    let a = [pilot.callsign];
    if ('flight_plan' in pilot && pilot.flight_plan) {
        a = a.concat([pilot.flight_plan.departure, '->', pilot.flight_plan.arrival]);
    }
    a = a.concat(['heading: ', pilot.heading, 'GS: ', pilot.groundspeed, 'gps: ', lat.toFixed(4), ',', lng.toFixed(4)])
    return a.join(' ');
}

function object_click(world, waypointsJson, dom_obj, obj, event) {
    const pilot = obj.extra_data;

    dom_obj.innerText = pilot_summary(pilot, pilot.latitude, pilot.longitude);

    function waypoint(a) {
        return {
            lat: waypointsJson.waypoints[a].lat,
            lng: waypointsJson.waypoints[a].lng,
            alt: (pilot.altitude * FOOT_IN_M) / (EARTH_RADIUS_KM * 1000) * 50,
            name: a
        };
    }
    if (!'flight_plan' in pilot || !'route' in pilot.flight_plan) {
        return;
    }

    const unkown_waypoints = pilot.flight_plan.route.split(' ').filter(wp => wp != "DCT" && !(wp in waypointsJson.waypoints || wp in waypointsJson.routes));
    if (unkown_waypoints.length > 0) {
        console.log('Unknown wp: ' + unkown_waypoints);
    }
    const decoded_waypoints = []
    let airway = null;
    let airway_start = null;
    let airway_end = null;
    pilot.flight_plan.route.split(' ').filter(wp => wp != "DCT").forEach(wp => {
        if (airway) {
            airway_end = wp;

            const index_start = airway.indexOf(airway_start);
            const index_end = airway.indexOf(airway_end);
            if (index_start >= 0 && index_end >= 0) {
                const direction = index_start < index_end ? 1 : -1;

                for (let i = index_start + direction; i * direction <= index_end * direction; i += direction) {
                    if (airway[i] in waypointsJson.waypoints) {
                        decoded_waypoints.push(waypoint(airway[i]));
                    } else {
                        console.log('Cannot find route waypoint: ' + airway[i])
                    }
                }
            } else {
                console.log('Cannot find ' + airway_start + ' or ' + airway_end + ' in airway');
                // Give up on the route but add the end way points.
                decoded_waypoints.push(waypoint(airway_end));
            }
            airway = null;
            airway_start = null;
            airway_end = null;
        }else if (wp in waypointsJson.waypoints) {
            decoded_waypoints.push(waypoint(wp));
        } else if (wp in waypointsJson.routes) {
            if (airway != null) {
                console.log('Cannot decode route airway');
            }
            airway = waypointsJson.routes[wp];
            airway_start = decoded_waypoints[decoded_waypoints.length - 1].name;
        }
    });
    if (!'departure' in pilot.flight_plan || !'arrival' in pilot.flight_plan) {
        return;
    }
    const departure_waypoint = []
    if (pilot.flight_plan.departure in waypointsJson.waypoints) {
        departure_waypoint.push({
            lat: waypointsJson.waypoints[pilot.flight_plan.departure].lat,
            lng: waypointsJson.waypoints[pilot.flight_plan.departure].lng,
            alt: 0,
            name: pilot.flight_plan.departure
        });
    }
    const arrival_waypoint = []
    if (pilot.flight_plan.arrival in waypointsJson.waypoints) {
        arrival_waypoint.push({
            lat: waypointsJson.waypoints[pilot.flight_plan.arrival].lat,
            lng: waypointsJson.waypoints[pilot.flight_plan.arrival].lng,
            alt: 0,
            name: pilot.flight_plan.arrival
        });
    } else {
        console.log(pilot.flight_plan.arrival)
    }
    const pathData = {
        'route': pilot.flight_plan.departure + ' ' + pilot.flight_plan.route + ' ' + pilot.flight_plan.arrival,
        'fixes': departure_waypoint.concat(decoded_waypoints).concat(arrival_waypoint)
    };
    pathData.fixes.forEach((wp) => {
        console.log(wp.name);
    });
    world.pathsData([pathData]);
}

function object(gltf, o) {
    const scene = gltf.scene.clone();
    const euler = new THREE.Euler(Math.PI / 2 - deg_to_rad(o.lat), deg_to_rad(o.lng), 0, 'ZYX');
    const q1 = new THREE.Quaternion();
    q1.setFromEuler(euler);
    const q2 = new THREE.Quaternion();
    q2.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI - deg_to_rad(o.extra_data.heading));
    const q3 = new THREE.Quaternion();
    q3.multiplyQuaternions(q1, q2)

    scene.setRotationFromQuaternion(q3);
    scene.scale.set(0.015, 0.015, 0.015);
    return scene;
}

function setupPlaneModel(world) {
    // Draw a blob before our model is loaded.
    const satGeometry = new THREE.OctahedronGeometry(BLOB_SIZE * world.getGlobeRadius() / EARTH_RADIUS_KM / 2, 0);
    const satMaterial = new THREE.MeshLambertMaterial({ color: 'palegreen', transparent: true, opacity: 0.7 });
    world.objectThreeObject(() => new THREE.Mesh(satGeometry, satMaterial));

    // Start loading model.
    loader.load('low_poly_airplane/scene.gltf', function (gltf) {
        world.objectThreeObject((o) => object(gltf, o));
    });
    // Load waypoints, install click events.
    fetch('./cifp/waypoints.json')
        .then((response) => response.json())
        .then((json) => {
            console.log('Got waypoints.');
            world.onObjectClick((object, event) => object_click(world, json, BOTTOM_RIGHT, object, event));
        });
}

function main() {
    const world = Globe()
        (document.getElementById('globe'))
        .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg')
        .objectLat('lat')
        .objectLng('lng')
        .objectAltitude('alt')
        .objectFacesSurface(false)
        .objectLabel('name')
        .pathPoints('fixes')
        .pathPointLat('lat')
        .pathPointLng('lng')
        .pathPointAlt('alt')
        .pathColor(() => 'rgba(255,0,255,0.6)')  // Children of the Magenta line!
        .pathStroke(5)
        .pathLabel('route')
        .pathDashLength(0.1)
        .pathDashGap(0.008)
        .pathDashAnimateTime(12000);
    setTimeout(() => world.pointOfView({ altitude: 2 }));
    setupPlaneModel(world);
    let vatsimJson = null;
    function loadVatsimJson() {
        fetch('//data.vatsim.net/v3/vatsim-data.json')
            .then((response) => response.json())
            .then((json) => {
                vatsimJson = json;
            })
    }
    loadVatsimJson();
    setInterval(loadVatsimJson, 30 * 1000);

    (function frameTicker() {
        requestAnimationFrame(frameTicker);

        const json = vatsimJson;
        if (!json) { return; }
        const time = new Date();
        const objects = [];
        json.pilots.forEach(pilot => {
            const dt = (time - new Date(pilot.last_updated)) / 1000;
            const object = {};
            const gpsc = new GPSCoordinates(pilot.latitude, pilot.longitude);
            gpsc.movebytime(pilot.heading, pilot.groundspeed, dt);

            object.lat = gpsc.latitude;
            object.lng = gpsc.longitude;
            object.alt = (pilot.altitude * 0.3048) / (EARTH_RADIUS_KM * 1000) * 50;
            object.name = pilot_summary(pilot, object.lat, object.lng);
            object.extra_data = pilot;
            objects.push(object);
        });
        world.objectsData(objects);
    })();
}

export { main };