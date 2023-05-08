const { Op } = require("sequelize");

module.exports = (key, requestQuery) => {
  {
    /**
     * key: key for which value to be searched
     * requestQuery: requestQuery passed in api url
     */
  }
  const { keyword, resultPerPage, currentPage, orderId } = requestQuery;
  console.log(keyword, resultPerPage, currentPage);
  let query = {};
  if (keyword) {
    query = {
      ...query,
      where: { [key]: { [Op.regexp]: keyword } },
    };
  }
  if(orderId) {
    query = {
      ...query,
      where: {[key]: parseInt(orderId)}
    }
  }
  console.log(JSON.stringify(query));

  if (resultPerPage && currentPage) {
    const cp = Number(currentPage); // cp = currentPage
    const rpp = Number(resultPerPage); // rpp = resultPerPage
    const skip = rpp * (cp - 1);
    query = { ...query, offset: skip, limit: rpp };
  }
  return query;
};
