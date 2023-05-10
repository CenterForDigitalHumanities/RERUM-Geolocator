# Rerum Geolocator
![image](https://user-images.githubusercontent.com/3287006/120902008-8bf19900-c603-11eb-9bf7-3c8f2b195103.png)


A small application to create GeoJSON-LD Web Annotations.  It saves the Annotations to RERUM as linked open data.

The Geolocator also has two viewers, one that uses [Leaflet](https://leafletjs.com/) and one that uses [MapML](https://maps4html.org/MapML/spec/).
The IIIF content state URL parameter `iiif-content` is available.  You may provide a Manifest or Canvas URI.  If the resource contains `navPlace`, 
it will be parsed for the GeoJSON.  You will see the GeoJSON shape render in the view.

[Manifest Example](http://geo.rerum.io/geolocate/leaflet-view.html?iiif-content=https://preview.iiif.io/cookbook/0154-geo-extension/recipe/0154-geo-extension/manifest.json)

[Canvas Example](http://geo.rerum.io/geolocate/leaflet-view.html?data-uri=http://devstore.rerum.io/v1/id/60bbc491c3fb58284513ed26) 

Another URL parameter `data-uri` is also supported.  You may provide a Web Annotation or Web Annotation Page.  The bodies will be parsed for GeoJSON, and you will see the GeoJSON shape render in the view.

[Annotation Example](http://geo.rerum.io/geolocate/leaflet-view.html?data-uri=http://devstore.rerum.io/v1/id/60bbc313c3fb58284513ed24)

[Annotation Page Example](http://geo.rerum.io/geolocate/leaflet-view.html?data-uri=http://devstore.rerum.io/v1/id/60bbc256c3fb58284513ed22)
