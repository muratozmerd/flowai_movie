const debug = require('debug')('webhook:routes:webview')

module.exports = (redis) => (req, res) => {
  const {
    id
  } = req.params

  redis.get(`location_${id}`, (err, reply) => {
    if(err) {
      console.error('Error while getting location from redis', id)
      return res.sendStatus(500)
    }
    const location = JSON.parse(reply)

    if(Array.isArray(location.OpeningHours)) {
      const openingToday = location.OpeningHours.find((day) => day.Day === getDayName())

      if(openingToday) {
        const openingTodayHours = openingToday.OpeningHours
        const hoursMatch = openingTodayHours.match(/^[0-9]{2}\.[0-9]{2}-([0-9]{2}\.[0-9]{2})$/i)
        if(hoursMatch) {
          location.OpeningHoursToday = hoursMatch[1]
        }
      }
    }

    res.render('location', location)
  })
}

const getDayName = () => {
  const number = new Date().getDay()
  switch(number) {
    case 0:
      return "Sunday"
    case 1:
      return "Monday"
    case 2:
      return "Tuesday"
    case 3:
      return "Wednesday"
    case 4:
      return "Thursday"
    case 5:
      return "Friday"
    case 6:
      return "Saturday"
  }
}
