function importFromFolder() {

  // SETTING UP VARIABLES
  const PROJECT_ID = "partner-db-api-test";
  const DATASET_ID = "alc_data";
  const TABLE_ID = "point_list_export";
  const FOLDER_ID = "1vIiyO3cI1ZbCtA9a9q7GWEezbNU96XvR"

  var nowDate = new Date();
  var curYear = nowDate.getFullYear();
  var curMonth = nowDate.getMonth();
  var addedDate = new Date(curYear, curMonth, 1);
  const dateAdded = Utilities.formatDate(addedDate, 'America/Los_Angeles', 'yyyy-MM-dd'); // is added to csv

  folder = DriveApp.getFolderById(FOLDER_ID);

  var files = folder.getFiles();
  while (files.hasNext()) {
    var file = files.next();

    sheet = SpreadsheetApp.openById(file.getId());
    Logger.log(sheet.getName());
    editSheet(sheet, dateAdded);
    Logger.log("Sheet edited")

    Logger.log("Writing to BQ");
    writeToBQ(sheet, dateAdded, PROJECT_ID, DATASET_ID, TABLE_ID);

  }
}

function editSheet(newSheet, date) {

  sheetName = newSheet.getName()
  Logger.log("Processing sheet: "+ sheetName);

  const buildingCode = sheetName.match(/[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+/g)[0];

  sheet = newSheet.getSheets()[0];

  sheet.deleteColumns(8, 1);
  sheet.insertColumns(1, 2);
  sheet.getRange(1, 1, 1, 1).setValue('date');
  sheet.getRange(1, 2, 1, 1).setValue('building');
  sheet.getRange(2, 1, sheet.getLastRow()-1, 1).setValue('"'+date+'"');
  sheet.getRange(2, 2, sheet.getLastRow()-1, 1).setValue(buildingCode);
  sheet.getRange(2, 1, sheet.getLastRow()-1, 1).setValue('"'+date+'"'); // add quotes to controlProgram so the field doesn't get split on commas
  var rangeReplace = sheet.getRange(1, 1, sheet.getLastRow()-1, 10);
  rangeReplace.createTextFinder(",").replaceAllWith("|");//commas in control program name jack up the csv
}

function writeToBQ(newSheet, dateAdded, project_id, dataset_id, table_id){
  // Create the data upload job.
  var job = {
    configuration: {
      load: {
        destinationTable: {
          projectId: project_id,
          datasetId: dataset_id,
          tableId: table_id
        },
        skipLeadingRows: 1,
        writeDisposition: 'WRITE_APPEND',
        fieldDelimiter: ','
      }
    }
  };

  // sheet = newSheet.getSheets()[0]
  sheetName = newSheet.getName();

  buildingCode = sheetName.match(/[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+/g)[0];

  duplicates = duplicateCheck(buildingCode, dateAdded, project_id, dataset_id, table_id);

  if (duplicates == 0 || (duplicates > 0 && sheet.getName().includes('[PT'))) { // workaround for edge-case when a building 
                                                                                //is represented in 2 parts in BMS
    Logger.log("No duplicates found, proceeding...")
    data = sheet.getRange(1, 1, sheet.getLastRow(), 10).getValues();
    dataString = data.join("\n");

    var newBlob = Utilities.newBlob(dataString, "text/csv");
    var writeBlob = newBlob.setContentType('application/octet-stream');

    try {
      var runJob = BigQuery.Jobs.insert(job, project_id, writeBlob);

      //debug
      Logger.log(runJob.status); 
      var jobId = runJob.jobReference.jobId;
      // Logger.log('jobId: ' + jobId);
      var status = BigQuery.Jobs.get(project_id, jobId);
      // wait for the query to finish running before you move on
      while (status.status.state === 'RUNNING') {
        Utilities.sleep(500);
        status = BigQuery.Jobs.get(project_id, jobId);
        // Logger.log('Status: ' + status);
      }
      Logger.log('FINISHED: '+ status);
      if (status.status.errors) {
        GmailApp.sendEmail("evgeniyaengel@google.com", "Failed to push to BQ: "+sheetName, status.status.errors);
      }
    } catch (err) {
      Logger.log(err);
      GmailApp.sendEmail("evgeniyaengel@google.com", "Failed to push to BQ: " + sheetName, "Error message: " + err);
      Logger.log('unable to insert job');
    }
  } else {
    Logger.log("Data already exists for " + buildingCode + " with " + dateAdded + " date. Skipping writing to BigTable.")
    // pass
  }

}