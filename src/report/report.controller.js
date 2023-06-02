var pdf = require("pdf-creator-node");
var fs = require("fs");
const path = require('path');
const catchAsyncError = require("../../utils/catchAsyncError");

// Read HTML Template
const templatePath = path.join(__dirname, 'template.html');
const templateHtml = fs.readFileSync(templatePath, 'utf-8');

var options = {
  format: "A3",
  orientation: "portrait",
  border: "10mm",
  header: {
    height: "10mm",
    contents: '<h1 style="text-align: center;">Daily Report (Entry and Exit)</h1>'
  },
  footer: {
    height: "20mm",
    contents: {
      first: 'Cover page',
      2: 'Second page', // Any page number is working. 1-based index
      default: '<span style="color: #444;">{{page}}</span>/<span>{{pages}}</span>', // fallback value
      last: 'Last Page'
    }
  }
};

const data = {
  clients: [
    {
      clientName: 'Client A',
      orders: [
        {
          No: 1,
          Date: '2023-05-01',
          Declaration: 'Declaration A',
          Product: 'Product A',
          TotalQty: 10,
          KgPerUnit: 2,
          TotalKg: 20,
          TruckNo: 'Truck A',
          Comments: 'Comment A'
        },
        {
          No: 2,
          Date: '2023-05-02',
          Declaration: 'Declaration B',
          Product: 'Product B',
          TotalQty: 5,
          KgPerUnit: 3,
          TotalKg: 15,
          TruckNo: 'Truck B',
          Comments: 'Comment B'
        }
      ]
    }
  ]
};


var document = {
  html: templateHtml,
  data,
  path: "./output.pdf",
  type: "buffer",
};

exports.getReport = catchAsyncError(async (req, res, next) => {
  console.log("download report", req.query);
  const report = await pdf.create(document, options);

  res.setHeader('Content-Type', 'application/pdf');
  res.status(200).send(report);
});
