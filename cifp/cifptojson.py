import json
import arinc424.record as arinc424

waypoints = {}
routes = {}
with open('FAACIFP18') as f:
    for line in f.readlines():
        record = arinc424.Record()
        record.read(line)
        obj = {}
        for e in record.fields:
            obj[e.name] = e.value.strip()
        def gpsparse(s):
            res = ''
            int_end = 3
            if s[0:1] in ['W', 'S']:
                res = res + '-'
            if s[0:1] in ['W', 'E']:
                int_end = 4
            res = res + str(int(s[1:int_end]))
            res = res + '.'
            res = res + s[int_end:]
            return res
        try:
            if 'Waypoint Identifier' in obj:
                waypoints[obj['Waypoint Identifier'].strip()] = {
                    'lat': gpsparse(obj['Waypoint Latitude']),
                    'lng': gpsparse(obj['Waypoint Longitude'])
                }
            elif 'Airport Name' in obj:
                waypoints[obj['Airport ICAO Identifier'].strip()] = {
                    'lat': gpsparse(obj['Airport Reference Pt. Latitude']),
                    'lng': gpsparse(obj['Airport Reference Pt. Longitude']),
                    'elevation': obj['Airport Elevation'],
                }
            elif 'VOR Name' in obj:
                if obj['DME Latitude'] and obj['DME Longitude']:
                    lat = obj['DME Latitude']
                    lng = obj['DME Longitude']
                if obj['VOR Latitude'] and obj['VOR Longitude']:
                    lat = obj['VOR Latitude']
                    lng = obj['VOR Longitude']
                waypoints[obj['VOR Identifier'].strip()] = {
                    'lat': gpsparse(lat),
                    'lng': gpsparse(lng),
                }
                if obj['DME Elevation']:
                    waypoints[obj['VOR Identifier'].strip()]['elevation'] = obj['DME Elevation']
            elif 'Route Identifier' in obj and 'Fix Identifier' in obj:
                if not obj['Route Identifier'] in routes:
                    routes[obj['Route Identifier']] = []
                routes[obj['Route Identifier']].append(obj['Fix Identifier'])
            else:
                print(obj)
        except:
            print(obj)
            raise

wpforjson = []
for k,v in waypoints.items():
    if 'elevation' in v:
       wpforjson.append(f'"{k}":{{"lat":{v["lat"]},"lng":{v["lng"]},"elevation":{int(v["elevation"])}}}');
    else:
        wpforjson.append(f'"{k}":{{"lat":{v["lat"]},"lng":{v["lng"]}}}');
with open('waypoints.json', 'w') as f:
    f.write('{"waypoints": {\n')
    f.write(',\n'.join(wpforjson))
    f.write('\n},\n"routes": ')
    f.write(json.dumps(routes, indent=0))
    f.write('\n}\n')
