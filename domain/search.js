const debug = require('debug')('webhook:domain:search'),
      request = require('request-promise-cache'),
      geodist = require('geodist'),
      maps = require('@google/maps')

const mapsClient = maps.createClient({
  key: process.env.GOOGLE_MAPS_API_KEY,
  Promise
})

class Search {

  constructor(redis) {
    this.locations = null
    this.redis = redis
  }

  async find(query) {

    debug('Executing query', query)

    try {
      debug('Loading availy locations')
      this.locations = await this.requestAvailyLocations()

      debug('Geocode any locations or use lat long')
      let coordinates

      if(query.coordinates) {
        coordinates = query.coordinates
      } else {
        coordinates = await this.geocode(query.locations)
      }

      debug('Filter the location set')
      let results = this.locations

      if(query.locations) {
        debug('Filter districts', query.locations)
        results = this.filterByDistrict(results, query.locations)
      }

      if(query.pois) {
        debug('Filter POIs', query.pois)
        results = this.filterByPOI(results, query.pois)
      }

      if(query.facilities) {
        debug('Filter Facilities', query.facilities)
        results = this.filterByFacilities(results, query.facilities)
      }

      if(coordinates) {
        debug('Sort the result set by distance')
        results = this.sortByDistance(results, coordinates)
      }

      return results
    } catch(err) {
      console.error('Error while trying to search for locations', err)
    }
  }


  async requestAvailyLocations() {
    const response = await request({
      url: process.env.AVAILY_ENDPOINT,
      cacheKey: process.env.AVAILY_ENDPOINT,
      cacheTTL: 3600,
      cacheLimit: 12,
      json: true
    })

    const locations = response.body

    if(!Array.isArray(locations)) {
      return []
    }

    for(let i=0;i<locations.length;i++) {
      const location = locations[i]
      this.redis.set(`location_${location.Id}`, JSON.stringify(location))
    }

    return locations
  }

  /**
   * Geocode a array of location names
   **/
  async geocode(locations) {

    if(!locations) {
      debug('Nothing to geocode')
      return false
    }

    debug('Geocode locations', locations)

    try {
      const coordinates = await Promise.all(
        locations.map( async (location) => {
          const address = location
          debug(`Geocoding address '${address}'`)

          const response = await mapsClient.geocode({
            address,
            region: 'nl',
            language: 'nl'
          }).asPromise()

          debug(`Received a location from Google for '${address}'`)
          return response.json.results[0].geometry.location
        })
      )
      debug('Geocoded coordinates', coordinates)
      return coordinates

    } catch(err) {
      console.error('Error during search', err)
      return false
    }
  }

  sortByDistance(locations, coordinates) {
    debug('Sorting with coordinates', coordinates)
    const sorted = locations.sort( (a, b) => {

      let distanceA = false
      let distanceB = false

      // Missing lat / lng?
      if(a.Lat === 0 || a.Lon === 0) {
        return 1
      }

      if(b.Lat === 0 || b.Lon === 0) {
        return -1
      }

      // WATCH IT! BACKEND MIXED UP LAT AND LONG!
      const fromA = {
        lat: a.Lon,
        lon: a.Lat
      }

      const fromB = {
        lat: b.Lon,
        lon: b.Lat
      }

      for(let i=0; i<coordinates.length;i++) {

        const to = {
          lat: coordinates[i].lat,
          lon: coordinates[i].lng || coordinates[i].long
        }

        const calculatedA = geodist(fromA, to, { unit: 'km', exact: true }) * 1000

        if(distanceA === false || distanceA > calculatedA) {
          distanceA = calculatedA
        }

        const calculatedB = geodist(fromB, to, { unit: 'km', exact: true }) * 1000

        if(distanceB === false || distanceB > calculatedB) {
          distanceB = calculatedB
        }
      }

      a.DistanceInMeters = (!a.DistanceInMeters || a.DistanceInMeters > distanceA) ? Math.floor(distanceA) : a.DistanceInMeters
      b.DistanceInMeters = (!b.DistanceInMeters || b.DistanceInMeters > distanceB) ? Math.floor(distanceB) : b.DistanceInMeters

      return (distanceA < distanceB) ? -1 : 1
    })

    return sorted
  }

  filterByFacilities(locations, facilities) {
    for(let i=0;i<facilities.length;i++) {
      const facility = facilities[i]
      locations = locations.filter((location) => (location.Facilities.indexOf(facility) >= 0))
    }
    return locations
  }

  filterByPOI(locations, pois) {
    for(let i=0;i<pois.length;i++) {
      const poi = pois[i]
      locations = locations.filter((location) => (location.Surroundings.indexOf(poi) >= 0))
    }
    return locations
  }

  filterByDistrict(locations, list) {
    for(let i=0;i<list.length;i++) {
      const item = list[i]
      locations = locations.filter((location) => (location.District.indexOf(item) >= 0 || location.Quarter.indexOf(item) >= 0))
    }
    return locations
  }
}

class Query {

  constructor({ locations, pois, facilities, horeca, streets, lat, long }) {

    debug('Creating query')
    this.locations = this.isValid(locations) ? locations : false
    this.pois = this.isValid(pois) ? pois : false
    this.facilities = this.isValid(facilities) ? facilities : false
    this.horeca = this.isValid(horeca) ? horeca : false
    this.streets = this.isValid(streets) ? streets : false
    this.coordinates = (lat && long) ? [{ lat: parseFloat(lat), long: parseFloat(long) }] : false
  }

  isValid(list) {
    return (Array.isArray(list) && list.length > 0)
  }
}


module.exports = { Query, Search }
