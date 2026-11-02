// Pin the timezone so date and DST tests behave the same on every machine.
module.exports = async () => {
  process.env.TZ = 'America/New_York';
};
