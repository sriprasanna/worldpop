/* global L */
var fc = require('turf-featurecollection')

var accessToken = require('./mapbox-access-token')
var polyColor = '#0571b0'

module.exports = class MapView {

  constructor (mapElementId, onPolygonChange, updateMapView) {
    var self = this
    this.onPolygonChange = onPolygonChange
    L.mapbox.accessToken = accessToken
    this.map = window.themap = L.mapbox.map('map', 'devseed.3a52f684')
      .setView([27.7121, 85.3404], 10)

    this.featureGroup = L.featureGroup().addTo(this.map)
    new L.Control.Draw({
      draw: {
        polygon: {
          allowIntersection: false,
          drawError: {
            color: '#e1e100',
            message: 'Self-interecting polygons are not supported.'
          },
          shapeOptions: {
            color: polyColor
          }
        },
        polyline: false,
        rectangle: false,
        circle: false,
        marker: false
      }
    }).addTo(this.map)

    this.map.on('draw:created', ({layer}) => onPolygonChange(layer))
    this.map.on('draw:edited', ({layers}) => layers.eachLayer(onPolygonChange))

    function updateView (e) {
      var {lat, lng} = self.map.getCenter()
      updateMapView(self.map.getZoom(), lng, lat)
    }
    this.map.on('moveend', updateView)
    this.map.on('zoomend', updateView)
  }

  /**
   * @param {GeoJSON} annotatedPoly - A GeoJSON polygon feature, annotated with
   * `totalPopulation`, `totalArea`, and `polygonArea` properties.
   */
  updatePolygon (layer, annotatedPoly) {
    let newLayer = L.geoJson(annotatedPoly, {
      style: function (feature) {
        return { color: polyColor }
      }
    })
    this.featureGroup.removeLayer(layer)
    this.featureGroup.addLayer(newLayer)

    let props = annotatedPoly.properties
    // attach popup with population data
    var ppl = Math.round(props.totalPopulation)
    var area = Math.round(props.polygonArea / 1e4) / 1e2
    newLayer.bindPopup(`
      Population: ${ppl} persons<br>
      Area: ${area} km^2<br>
      Density: ${ppl / area} persons / km^2`)
    newLayer.openPopup()
  }

  /**
   * @param {string|GeoJSON} geojson - A GeoJSON polygon feature.
   */
  setPolygon (geojson) {
    var self = this
    this.featureGroup.eachLayer(function (layer) {
      self.featureGroup.removeLayer(layer)
    })
    if (!geojson) return
    try {
      let parsed = typeof geojson === 'string' ? JSON.parse(geojson) : geojson
      L.geoJson(parsed, {
        onEachFeature: (feat, layer) => {
          console.log('feature', feat)
          this.onPolygonChange(layer)
        }
      })
    } catch(e) {
      console.error(e)
    }
  }

  drawnPolygonsToGeoJSON () {
    let features = []
    this.featureGroup.eachLayer((layer) => {
      console.log('layer', layer.toGeoJSON())
      features.push(layer.toGeoJSON().features)
    })
    return fc(Array.prototype.concat.apply([], features))
  }

  setView (options) {
    this.map.setZoom(options.zoom)
    this.map.panTo([options.latitude, options.longitude])
  }
}
