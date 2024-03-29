const { Op } = require("sequelize");
const { roleModel } = require("../src/user");

module.exports = (key, requestQuery) => {
  {
    /**
     * key: key for which value to be searched
     * requestQuery: requestQuery passed in api url
     */
  }
  const { keyword, resultPerPage, currentPage, orderId, role, unassigned } = requestQuery;
  console.log(keyword, resultPerPage, currentPage);
  let query = { where: {} };
  if (keyword) {
    query.where = {
      ...query.where,
      [key]: { [Op.regexp]: keyword },
    };
  }
  if (orderId) {
    query.where = {
      ...query.where,
      [key]: parseInt(orderId)
    };
  }
  if (unassigned) {
    console.log({ unassigned })
    query.where = {
      ...query.where,
      [unassigned]: null
    }
  }
  console.log(JSON.stringify(query));

  if (resultPerPage && currentPage) {
    const cp = Number(currentPage); // cp = currentPage
    const rpp = Number(resultPerPage); // rpp = resultPerPage
    const skip = rpp * (cp - 1);
    query = { ...query, offset: skip, limit: rpp };
  }
  console.log({ query })
  return query;
};
