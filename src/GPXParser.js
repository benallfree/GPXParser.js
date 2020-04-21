/**
 * GPX file parser
 * 
 * @constructor
 */
let gpxParser = function () {
    this.xmlSource = "";
    this.metadata  = {};
    this.waypoints = [];
    this.tracks    = [];
    this.routes    = [];
};

gpxParser.SAMPLING_MODE = {
    INDEX: 'index',
    DISTANCE: 'distance'
}

/**
 * Parse a gpx formatted string to a GPXParser Object
 * 
 * @param {string} gpxstring - A GPX formatted String
 * 
 * @return {gpxParser} A GPXParser object
 */
gpxParser.prototype.parse = function (gpxstring, config = {}) {

    let keepThis = this;
    config = {
        samplingMode: config.samplingMode || 'index',
        sampling: config.sampling || 1,
    };

    let domParser = new window.DOMParser();
    this.xmlSource = domParser.parseFromString(gpxstring, 'text/xml');

    metadata = this.xmlSource.querySelector('metadata');
    if(metadata != null){
        this.metadata.name  = this.getElementValue(metadata, "name");
        this.metadata.desc  = this.getElementValue(metadata, "desc");
        this.metadata.time  = this.getElementValue(metadata, "time");

        let author = {};
        let authorElem = metadata.querySelector('author');
        if(authorElem != null){
            author.name = this.getElementValue(authorElem, "name");
            author.email  = {};
            let emailElem = authorElem.querySelector('email');
            if(emailElem != null){
                author.email.id     = emailElem.getAttribute("id");
                author.email.domain = emailElem.getAttribute("domain");
            }

            let link     = {};
            let linkElem = authorElem.querySelector('link');
            if(linkElem != null){
                link.href = linkElem.getAttribute('href');
                link.text = this.getElementValue(linkElem, "text");
                link.type = this.getElementValue(linkElem, "type");
            }
            author.link = link;
        }
        this.metadata.author = author;

        let link = {};
        let linkElem = this.queryDirectSelector(metadata, 'link');
        if(linkElem != null){
            link.href = linkElem.getAttribute('href');
            link.text = this.getElementValue(linkElem, "text");
            link.type = this.getElementValue(linkElem, "type");
            this.metadata.link = link;
        }
    }

    var wpts = [].slice.call(this.xmlSource.querySelectorAll('wpt'));
    for (let idx in wpts){
        var wpt = wpts[idx];
        let pt  = {};
        pt.name = keepThis.getElementValue(wpt, "name")
        pt.lat  = parseFloat(wpt.getAttribute("lat"));
        pt.lon  = parseFloat(wpt.getAttribute("lon"));
        pt.ele  = parseFloat(keepThis.getElementValue(wpt, "ele")) || null;
        pt.cmt  = keepThis.getElementValue(wpt, "cmt");
        pt.desc = keepThis.getElementValue(wpt, "desc");
        keepThis.waypoints.push(pt);
    }

    var rtes = [].slice.call(this.xmlSource.querySelectorAll('rte'));
    for (let idx in rtes){
        var rte = rtes[idx];
        let route = {};
        route.name   = keepThis.getElementValue(rte, "name");
        route.cmt    = keepThis.getElementValue(rte, "cmt");
        route.desc   = keepThis.getElementValue(rte, "desc");
        route.src    = keepThis.getElementValue(rte, "src");
        route.number = keepThis.getElementValue(rte, "number");

        let type     = keepThis.queryDirectSelector(rte, "type");
        route.type   = type != null ? type.innerHTML : null;

        let link     = {};
        let linkElem = rte.querySelector('link');
        if(linkElem != null){
            link.href = linkElem.getAttribute('href');
            link.text = keepThis.getElementValue(linkElem, "text");
            link.type = keepThis.getElementValue(linkElem, "type");
        }
        route.link = link;

        let routepoints = [];
        var rtepts = [].slice.call(rte.querySelectorAll('rtept'));

        for (let idxIn in rtepts){
            var rtept = rtepts[idxIn];
            let pt    = {};
            pt.lat    = parseFloat(rtept.getAttribute("lat"));
            pt.lon    = parseFloat(rtept.getAttribute("lon"));
            pt.ele    = parseFloat(keepThis.getElementValue(rtept, "ele"));
            routepoints.push(pt);
        }

        route.distance  = keepThis.calculDistance(routepoints);
        route.elevation = keepThis.calcElevation(routepoints);
        route.slopes    = keepThis.calculSlope(routepoints, route.distance.cumul, config.samplingMode, config.sampling);
        route.points    = routepoints;

        keepThis.routes.push(route);
    }

    var trks = [].slice.call(this.xmlSource.querySelectorAll('trk'));
    for (let idx in trks){
        var trk = trks[idx];
        let track = {};

        track.name   = keepThis.getElementValue(trk, "name");
        track.cmt    = keepThis.getElementValue(trk, "cmt");
        track.desc   = keepThis.getElementValue(trk, "desc");
        track.src    = keepThis.getElementValue(trk, "src");
        track.number = keepThis.getElementValue(trk, "number");

        let type     = keepThis.queryDirectSelector(trk, "type");
        track.type   = type != null ? type.innerHTML : null;

        let link     = {};
        let linkElem = trk.querySelector('link');
        if(linkElem != null){
            link.href = linkElem.getAttribute('href');
            link.text = keepThis.getElementValue(linkElem, "text");
            link.type = keepThis.getElementValue(linkElem, "type");
        }
        track.link = link;

        let trackpoints = [];
        var trkpts = [].slice.call(trk.querySelectorAll('trkpt'));
	    for (let idxIn in trkpts){
            var trkpt = trkpts[idxIn];
            let pt = {};
            pt.lat = parseFloat(trkpt.getAttribute("lat"));
            pt.lon = parseFloat(trkpt.getAttribute("lon"));
            pt.ele = parseFloat(keepThis.getElementValue(trkpt, "ele")) || null;
            trackpoints.push(pt);
        }
        track.distance  = keepThis.calculDistance(trackpoints);
        track.elevation = keepThis.calcElevation(trackpoints);
        track.slopes    = keepThis.calculSlope(trackpoints, track.distance.cumul, config.samplingMode, config.sampling);
        track.points    = trackpoints;

        keepThis.tracks.push(track);
    }
};

/**
 * Get value from a XML DOM element
 * 
 * @param  {Element} parent - Parent DOM Element
 * @param  {string} needle - Name of the searched element
 * 
 * @return {} The element value
 */
gpxParser.prototype.getElementValue = function(parent, needle){
    let elem = parent.querySelector(needle);
    if(elem != null){
        return elem.innerHTML != undefined ? elem.innerHTML : elem.childNodes[0].data;
    }
    return elem;
}


/**
 * Search the value of a direct child XML DOM element
 * 
 * @param  {Element} parent - Parent DOM Element
 * @param  {string} needle - Name of the searched element
 * 
 * @return {} The element value
 */
gpxParser.prototype.queryDirectSelector = function(parent, needle) {

    let elements  = parent.querySelectorAll(needle);
    let finalElem = elements[0];

    if(elements.length > 1) {
        let directChilds = parent.childNodes;

        for(idx in directChilds) {
            elem = directChilds[idx];
            if(elem.tagName === needle) {
                finalElem = elem;
            }
        }
    }

    return finalElem;
}

/**
 * Calcul the Distance Object from an array of points
 * 
 * @param  {} points - An array of points with lat and lon properties
 * 
 * @return {DistanceObject} An object with total distance and Cumulative distances
 */
gpxParser.prototype.calculDistance = function(points) {
    let distance = {};
    let totalDistance = 0;
    let cumulDistance = [];
    for (var i = 0; i < points.length - 1; i++) {
        totalDistance += this.calcDistanceBetween(points[i],points[i+1]);
        cumulDistance[i] = totalDistance;
    }
    cumulDistance[points.length - 1] = totalDistance;

    distance.total = totalDistance;
    distance.cumul = cumulDistance;

    return distance;
}

/**
 * Calcul Distance between two points with lat and lon
 * 
 * @param  {} wpt1 - A geographic point with lat and lon properties
 * @param  {} wpt2 - A geographic point with lat and lon properties
 * 
 * @returns {float} The distance between the two points
 */
gpxParser.prototype.calcDistanceBetween = function (wpt1, wpt2) {
    let latlng1 = {};
    latlng1.lat = wpt1.lat;
    latlng1.lon = wpt1.lon;
    let latlng2 = {};
    latlng2.lat = wpt2.lat;
    latlng2.lon = wpt2.lon;
    var rad = Math.PI / 180,
		    lat1 = latlng1.lat * rad,
		    lat2 = latlng2.lat * rad,
		    sinDLat = Math.sin((latlng2.lat - latlng1.lat) * rad / 2),
		    sinDLon = Math.sin((latlng2.lon - latlng1.lon) * rad / 2),
		    a = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon,
		    c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return 6371000 * c;
}

/**
 * Generate Elevation Object from an array of points
 * 
 * @param  {} points - An array of points with ele property
 * 
 * @returns {ElevationObject} An object with negative and positive height difference and average, max and min altitude data
 */
gpxParser.prototype.calcElevation = function (points) {
    var dp = 0,
        dm = 0,
        ret = {};

    for (var i = 0; i < points.length - 1; i++) {
        var diff = parseFloat(points[i + 1].ele) - parseFloat(points[i].ele);

        if (diff < 0) {
            dm += diff;
        } else if (diff > 0) {
            dp += diff;
        }
    }

    var elevation = [];
    var sum = 0;

    for (var i = 0, len = points.length; i < len; i++) {
        var ele = parseFloat(points[i].ele);
        elevation.push(ele);
        sum += ele;
    }

    ret.max = Math.max.apply(null, elevation) || null;
    ret.min = Math.min.apply(null, elevation) || null;
    ret.pos = Math.abs(dp) || null;
    ret.neg = Math.abs(dm) || null;
    ret.avg = sum / elevation.length || null;

    return ret;
};

/**
 * Generate slopes Object from an array of Points and an array of Cumulative distance 
 * Work with 2 sampling modes :
 *  - gpxParser.SAMPLING_MODE.INDEX : Slopes are calculated between each <sampling> points
 *  - gpxParser.SAMPLING_MODE.DISTANCE : Slopes are calculated between each <sampling> meters
 * 
 * @param  {} points - An array of points with ele property
 * @param  {} cumul - An array of cumulative distance
 * @param  {} samplingMode - Sampling Mode (gpxParser.SAMPLING_MODE)
 * @param  {} sampling - Sampling value
 * 
 * @returns {SlopeObject} An array of slopes
 */
gpxParser.prototype.calculSlope = function(points, cumul, samplingMode, sampling, average) {
    let slopes = [];
    let tempSlopes = [];
    let stepDistance = 0;

    for (var i = 0; i < points.length - 1; i++) {
        let point = points[i];
        let nextPoint = points[i+1];
        let elevationDiff = nextPoint.ele - point.ele;
        let distance = cumul[i+1] - cumul[i];

        let slope = (elevationDiff * 100) / distance;
        tempSlopes.push(slope);

        if (samplingMode == gpxParser.SAMPLING_MODE.DISTANCE) {
            stepDistance += distance;
            if (stepDistance >= sampling || i == points.length - 1) {
                slopes.push(tempSlopes.reduce((a,b) => a + b, 0) / tempSlopes.length);
                tempSlopes = [];
                stepDistance = 0;
            }
        } else if (samplingMode == gpxParser.SAMPLING_MODE.INDEX) {
            if (i%sampling == 0 || i == points.length - 1) {
                slopes.push(tempSlopes.reduce((a,b) => a + b, 0) / tempSlopes.length);
                tempSlopes = [];
            } 
        }
    }

    return slopes;
}

/**
 * Export the GPX object to a GeoJSON formatted Object
 * 
 * @returns {} a GeoJSON formatted Object
 */
gpxParser.prototype.toGeoJSON = function () {
    var GeoJSON = {
        "type": "FeatureCollection",
        "features": [],
        "properties": {
            "name": this.metadata.name,
            "desc": this.metadata.desc,
            "time": this.metadata.time,
            "author": this.metadata.author,
            "link": this.metadata.link,
        },
    };

    for(idx in this.tracks) {
        let track = this.tracks[idx];

        var feature = {
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": []
            },
            "properties": {
            }
        };

        feature.properties.name   = track.name;
        feature.properties.cmt    = track.cmt;
        feature.properties.desc   = track.desc;
        feature.properties.src    = track.src;
        feature.properties.number = track.number;
        feature.properties.link   = track.link;
        feature.properties.type   = track.type;

        for(idx in track.points) {
            let pt = track.points[idx];
        
            var geoPt = [];
            geoPt.push(pt.lon);
            geoPt.push(pt.lat);
            geoPt.push(pt.ele);

            feature.geometry.coordinates.push(geoPt);
        }

        GeoJSON.features.push(feature);
    }

    for(idx in this.routes) {
        let track = this.routes[idx];

        var feature = {
            "type": "Feature",
            "geometry": {
                "type": "LineString",
                "coordinates": []
            },
            "properties": {
            }
        };

        feature.properties.name   = track.name;
        feature.properties.cmt    = track.cmt;
        feature.properties.desc   = track.desc;
        feature.properties.src    = track.src;
        feature.properties.number = track.number;
        feature.properties.link   = track.link;
        feature.properties.type   = track.type;


        for(idx in track.points) {
            let pt = track.points[idx];
        
            var geoPt = [];
            geoPt.push(pt.lon);
            geoPt.push(pt.lat);
            geoPt.push(pt.ele);

            feature.geometry.coordinates.push(geoPt);
        }

        GeoJSON.features.push(feature);
    }

    for(idx in this.waypoints) {
        let pt = this.waypoints[idx];
    
        var feature = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": []
            },
            "properties": {
            }
        };

        feature.properties.name = pt.name;
        feature.properties.cmt  = pt.cmt;
        feature.properties.desc = pt.desc;

        feature.geometry.coordinates = [pt.lon, pt.lat, pt.ele];

        GeoJSON.features.push(feature);
    }

    return GeoJSON;
}

if(typeof module !== 'undefined')
    module.exports = gpxParser;