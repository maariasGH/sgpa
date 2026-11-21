const pathApi = (req) => {
  const path = req.path || req.originalUrl.split('?')[0];
  return path.replace(/^\/api(?=\/)/i, '');
};

const esSubidaVideo = (req) => req.method === 'PUT'
  && /^\/audiencias\/\d+\/video\/?$/i.test(pathApi(req));

const esUrlVideoAudiencia = (req) => req.method === 'GET'
  && /^\/audiencias\/\d+\/video-url\/?$/i.test(pathApi(req));

module.exports = { esSubidaVideo, esUrlVideoAudiencia };
