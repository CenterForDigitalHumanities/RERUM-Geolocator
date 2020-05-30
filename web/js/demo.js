/* 
 * To change this license header, choose License Headers in Project Properties.
 * To change this template file, choose Tools | Templates
 * and open the template in the editor.
 */


GEOCODER = {}

GEOCODER.mymap={}

GEOCODER.APPAGENT = "http://devstore.rerum.io/v1/id/5ed28964e4b048da2fa4be2b"

GEOCODER.URLS = {
    BASE_ID: "http://devstore.rerum.io/v1",
    DELETE: "http://tinydev.rerum.io/app/delete",
    CREATE: "http://tinydev.rerum.io/app/create",
    UPDATE: "http://tinydev.rerum.io/app/update",
    QUERY: "http://tinydev.rerum.io/app/query",
    OVERWRITE: "http://tinydev.rerum.io/app/overwrite"
}

GEOCODER.init =  async function(){
    let latlong = [12, 12] //default starting coords
    let historyWildcard = {"$exists":true, "$size":0}
    let geoWildcard = {"$exists":true}
    let geos = []
    document.getElementById("leafLat").oninput = GEOCODER.updateGeometry
    document.getElementById("leafLong").oninput = GEOCODER.updateGeometry
    //For my map demo app
    let geoAssertionsQuery = {
        "__rerum.history.next": historyWildcard,
        "__rerum.generatedBy"  : GEOCODER.APPAGENT,
        "creator" : "geocoding@rerum.io"
    }
    let geoAssertions = await fetch(GEOCODER.URLS.QUERY, {
        method: "POST",
        mode: "cors",
        body: JSON.stringify(geoAssertionsQuery)
    })
    .then(response => response.json())
    .then(geoMarkers => {
        return geoMarkers.map(anno => {
           anno.body["@id"] = anno["@id"] ? anno["@id"] : anno.id ? anno.id : ""
           //We assume the application that created these coordinates did not apply properties.  
           if(!anno.body.hasOwnProperty("properties")){
               anno.body.properties = {}
           }
           anno.body.properties.targetID = anno.target ? anno.target : ""
           anno.body.properties.isUpdated = GEOCODER.checkForUpdated(anno)
           return anno.body
        })
    })
    .then(async function(geos) {
        let targetObjDescription, targetObjLabel = ""
        let isIIIF = false
        let allGeos = await geos.map(async function(geoJSON){ 
            let targetURI = geoJSON.properties["@id"] ? geoJSON.properties["@id"] : geoJSON.properties.targetID ? geoJSON.properties.targetID : ""
            let targetProps = {"label":"Target Label Unknown","description":"Target Description Unknown", "creator" : "geocoding@rerum.io", "isIIIF":false, "isUpdated":geoJSON.properties.isUpdated}
            targetProps.targetID = targetURI
            if(geoJSON.hasOwnProperty("properties") && (geoJSON.properties.label || geoJSON.properties.description) ){
                targetProps = geoJSON.properties
                targetProps.creator = "geocoding@rerum.io"
                targetProps.targetID = targetURI
            }
            else{
               let targetObj = await fetch(targetURI)
                .then(resp => resp.json())
                .catch(err => {
                    console.error(err)
                    return null
                })
                if(targetObj){
                    isIIIF = GEOCODER.checkForIIIF(targetObj)
                    targetObjDescription = targetObj.description ? targetObj.description : "Target Description Unknown"
                    targetObjLabel = targetObj.label ? targetObj.label : targetObj.name ? targetObj.name : "Target Label Unknown"
                    targetProps = {"targetID":targetURI, "label":targetObjLabel, "description":targetObjDescription, "creator":"geocoding@rerum.io", "isIIIF":isIIIF, "isUpdated":geoJSON.properties.isUpdated}
                }
                else{
                    //alert("Target URI could not be resolved.  The annotation will still be created and target the URI provided, but certain information will be unknown.")
                } 
            }
            return {"@id":geoJSON["@id"], "properties":targetProps, "type":"Feature", "geometry":geoJSON.geometry} 
        })
        return Promise.all(allGeos)
    })           
    .catch(err => {
        console.error(err)
        return []
    })

}
    
GEOCODER.initializeMap = async function(coords, geoMarkers){
    GEOCODER.mymap = L.map('leafletInstanceContainer')   
    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoidGhlaGFiZXMiLCJhIjoiY2pyaTdmNGUzMzQwdDQzcGRwd21ieHF3NCJ9.SSflgKbI8tLQOo2DuzEgRQ', {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 100,
        id: 'mapbox.satellite', //mapbox.streets
        accessToken: 'pk.eyJ1IjoidGhlaGFiZXMiLCJhIjoiY2pyaTdmNGUzMzQwdDQzcGRwd21ieHF3NCJ9.SSflgKbI8tLQOo2DuzEgRQ'
    }).addTo(GEOCODER.mymap);
    GEOCODER.mymap.setView(coords,8);

    L.geoJSON(geoMarkers, {
        pointToLayer: function (feature, latlng) {
            let appColor = "#336699"
            return L.circleMarker(latlng, {
                radius: 8,
                fillColor: appColor,
                color: "#000",
                weight: 1,
                opacity: 1,
                fillOpacity: 0.8
            });
        },
        onEachFeature: GEOCODER.pointEachFeature
    }).addTo(GEOCODER.mymap)
    leafletInstanceContainer.style.backgroundImage = "none"
    loadingMessage.classList.add("is-hidden")
}

GEOCODER.pointEachFeature = function (feature, layer) {
    //@id, label, description
    layer.hasMyPoints = true
    layer.isHiding = false
    let popupContent = ""
    if (feature.properties) {
        if(feature.properties.isIIIF){
            popupContent += `<p class="color6 featureCompliance">IIIF Compliant Target</p>`
        }
        if(feature.properties.label) {
            popupContent += `<div class="featureInfo"><label>Target Label:</label>${feature.properties.label}</div>`
        }
        if(feature.properties.targetID || feature.properties["@id"]){
            let targetURI = feature.properties["@id"] ? feature.properties["@id"] : feature.properties.targetID ? feature.properties.targetID : ""
            popupContent += `<div class="featureInfo"><label> Target URI:</label><a target='_blank' href='${targetURI}'>See Target Data</a></div>`
        }
        if(feature.properties.description) {
            popupContent += `<div class="featureInfo"><label> Target Description:</label>${feature.properties.description}</div>`
        }
        if(feature.properties.creator) {
            popupContent += `<div class="featureInfo"><label>Annotation Generated By</label>${feature.properties.creator}</div>`
        }
        if(feature["@id"]) {
            popupContent += `<div class="featureInfo"><label>Annotation URI:</label><a target='_blank' href='${feature["@id"]}'>See Annotation Data</a></div>`
        }
    }
    layer.bindPopup(popupContent);
}

GEOCODER.goToCoords = function(event){
    if(leafLat.value && leafLong.value){
        let coords = [leafLat.value, leafLong.value]
        GEOCODER.mymap.flyTo(coords,8)
        document.getElementById("currentCoords").innerHTML = "["+coords.toString()+"]"
    }
}

GEOCODER.filterMarkers = async function(event){
    let app = event.target.getAttribute("app")
    GEOCODER.mymap.eachLayer(function(layer) {
        if ( layer.hasMyPoints ) {
            if(app === "isIIIF"){
                if(layer.feature.properties.isIIIF){
                    //Then it is for sure showing and we want it to stay showing
                }
                else{
                    //It is a node we want to toggle
                    if(layer.isHiding){
                        tog.setAttribute("title","Remove all assertions that do not target IIIF resources.")
                        tog.value="IIIF Assertions Only"
                        layer.isHiding = false
                        layer.setRadius(8)
                        layer.getPopup().addEventListener("click")
                        let appColor = "#336699"
                        layer.setStyle({
                            color: "#000",
                            fillColor : appColor
                        })
                    }
                    else{
                        tog.setAttribute("title","See ALL assertions, even those that do not target IIIF resouces.")
                        tog.value="All Assertions"
                        layer.isHiding = true 
                        layer.setRadius(0)
                        layer.getPopup().removeEventListener("click")
                        layer.setStyle({
                            color: 'rgba(0,0,0,0)',
                            fillColor : 'rgba(0,0,0,0)'
                        })
                    }
                }
            }
        }
    })
}
                      

/**
 * Connect with the RERUm API to create the Annotation Linked Open Data object.
 * @param {type} event
 * @param {type} app
 * @return {Boolean}
 */
GEOCODER.submitAnno = async function(event, app){
    let geo = {}
    let lat = parseInt(leafLat.value * 1000000) / 1000000
    let long = parseInt(leafLong.value * 1000000) / 1000000
    if (lat && long) {
        geo = {
            type: "Point",
            coordinates: [long, lat]
        }
    }
    else{
        alert("Supply both a latitude and a longitude")
        return false
    }
    let geoJSON = {
        "@context": "http://geojson.org/geojson-ld/geojson-context.jsonld",
        "properties":{},
        "geometry": geo,
        "type": "Feature"
    }
    let targetURL = document.getElementById('objURI').value
    if(targetURL){
        let demoAnno = 
            {
                "type":"Annotation",
                "@context":"http://iiif.io/api/presentation/3/context.json",
                "motivation":"geocode",
                "target":targetURL,   
                "body":geoJSON,
                "creator":"geocoding@rerum.io"
            }

        let createdObj = await fetch(GEOCODER.URLS.CREATE, {
            method: "POST",
            mode: "cors",
            body: JSON.stringify(demoAnno)
        })
        .then(response => response.json())
        .then(newObj => {return newObj.new_obj_state})
        alert("A coordinate annotation was created that targets "+targetURL+".  Enter new coordinates to create another.")
    }
    else{
        alert("The annotation was not created.  You must supply a URI for this annotation to target.")
        return false
    }

}

/**
 * Check if the given object has a valid IIIF context associated with it
 * @param {type} obj
 * @return {Boolean}
 */
GEOCODER.checkForIIIF = function(targetObj){
    if(targetObj["@context"]){
        if(Array.isArray(targetObj["@context"])){
            return targetObj["@context"].includes("http://iiif.io/api/presentation/3/context.json") || targetObj["@context"].includes("http://iiif.io/api/presentation/2/context.json")
        }
        else if(typeof targetObj["@context"] === "string"){
           return targetObj["@context"] === "http://iiif.io/api/presentation/3/context.json" || targetObj["@context"] === "http://iiif.io/api/presentation/2/context.json" 
        }
    }
    return false
}






