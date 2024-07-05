function getPointsList() {

  // SETTING UP VARIABLES
  const PROJECT_ID = "partner-db-api-test";
  const DATASET_ID = "alc_data";
  const TABLE_ID = "point_list_export";
  const ROOT_FOLDER_ID = "1YPZ_RTs7TP8RAUA21jvJh8tV8V6MI231";

  var nowDate = new Date();

  var curYear = nowDate.getFullYear();
  var curMonth = nowDate.getMonth();
  var addedDate = new Date(curYear, curMonth, 1);

  var pastDate = new Date();
  pastDate.setDate(addedDate.getDate() - 1);

  // use tomorrow in order to include today
  var tomorrow = new Date();
  tomorrow.setDate(nowDate.getDate() + 1);

  // get shortened strings for use in Gmail search and date column in csv
  const pastDateStr = Utilities.formatDate(pastDate, 'America/Los_Angeles', 'yyyy/MM/dd');
  const tomorrowStr = Utilities.formatDate(tomorrow, 'America/Los_Angeles', 'yyyy/MM/dd');
  const dateAdded = Utilities.formatDate(addedDate, 'America/Los_Angeles', 'yyyy-MM-dd'); // is added to csv

  EMAIL_FILTER = "in:anywhere subject:Points List is:unread has:attachment filename:csv after:"+ pastDateStr + "before:" + tomorrowStr
  MAX_NUM_THREADS = 250;
//______________________________

  // CREATING A NEW FOLDER IN DRIVE
  newFolder = createNewFolder(ROOT_FOLDER_ID, dateAdded);
  Utilities.sleep(100);


  // GETTING THREADS
  // get array of all unread emails from ALC containing a csv attachment with Points Report over the last 24 hours (BAU state will execute this every 24 hours)
  Logger.log("Fetching threads between " + pastDateStr + ' and ' + tomorrowStr)
  // var threads = GmailApp.search("in:anywhere from:ALC OR from:WebCTRL subject:Points List is:unread has:attachment filename:csv after:"+ pastDateStr + "before:" + tomorrowStr, 0, 300);
  var threads = GmailApp.search(EMAIL_FILTER, 0, MAX_NUM_THREADS);
  Logger.log("Found " + threads.length + " threads.");


  // loop through the threads
  for (i=0;i<threads.length;i++) { 
    Logger.log("Processing thread " + i)

    // get each individual email message
    // Logger.log("Getting messages...")
    var messages = threads[i].getMessages();

    //Iterate messages of each thread
    for (j=0;j<messages.length;j++){

      // data to add to csv before pushing to BigTable
      const subject = messages[j].getSubject();

      Logger.log("Fetching data for " + subject + "; " + messages[j].getDate());
      var attachCsv = messages[j].getAttachments()[0]; // already a blob
      Logger.log("Fetched csv: " + attachCsv.getName())

      // insert files as sheets in the new folder
      let config = {
        title: subject,
        parents: [{id: newFolder.getId()}],
        mimeType: "application/vnd.google-apps.spreadsheet",
      };

      // checking if the file with such name already exists:
      existingFiles = newFolder.getFilesByName(attachCsv.getName());

      if (existingFiles.hasNext()) {
        // delete if already exists
        Logger.log("File exists in the folder, removing existing file: " + existingFiles.next().getName())
        // existingFiles.next().setTrashed(true);
      }
      Logger.log("Processing "+subject)
      newFile = Drive.Files.insert(config, attachCsv, {convert: true, supportsAllDrives: true});
      Logger.log("Sheet saved")

      newFileId = newFile.id
      Logger.log(newFileId)

      newSheet = SpreadsheetApp.openById(newFileId);//SpreadsheetApp.openByUrl();
      try {
        editSheet(newSheet, dateAdded);
        Logger.log("Sheet edited")

        Logger.log("Writing to BQ");
        writeToBQ(newSheet, dateAdded, PROJECT_ID, DATASET_ID, TABLE_ID);
        Utilities.sleep(500);
      } catch (err) {
        Logger.log(err);
        Logger.log('unable to edit sheet');
        GmailApp.sendEmail("evgeniyaengel@google.com", "Failed to edit sheet: " + newFileId, "Error message: " + err);
      }
      
    }
    // Logger.log("Cleaning up...")
    // // label, mark as read and move thread to trash
    // label = GmailApp.getUserLabelByName("ALC Processed");
    threads[i].markRead();
    // threads[i].addLabel(label);
    threads[i].moveToTrash();
  }

  // remove threads from trash
  // trashCleanup();
}


//---------------------------
//---- HELPER FUNCTIONS -----
//---------------------------

function createNewFolder(rootFolderId, folderName) {

  var optionalArgs={supportsAllDrives: true};
  var resource = {
    title: folderName,
    description: "point exports " + folderName,
    mimeType: "application/vnd.google-apps.folder",
    parents:[{
      "id": rootFolderId
    }]
  }

  rootFolder = DriveApp.getFolderById(rootFolderId);
  if(rootFolder.getFoldersByName(folderName).hasNext()) { // if folder already exists
    newFolder = rootFolder.getFoldersByName(folderName).next();
    Logger.log("Folder with this date already exists, saving files here: "+newFolder);
  } else {
    idNewFolder = Drive.Files.insert(resource, null, optionalArgs).id;
    newFolder = DriveApp.getFolderById(idNewFolder);
    Logger.log("Created a new folder: "+newFolder);
    Utilities.sleep(100);
  }

  return newFolder;
}

function editSheet(newSheet, date) {

  sheetName = newSheet.getName()
  Logger.log("Processing sheet: "+ sheetName);

  const buildingCode = sheetName.match(/[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+/g)[0];

  sheet = newSheet.getSheets()[0];

  try { 
    sheet.deleteColumns(8, 1);
    sheet.insertColumns(1, 2);
    sheet.getRange(1, 1, 1, 1).setValue('date');
    sheet.getRange(1, 2, 1, 1).setValue('building');
    sheet.getRange(2, 1, sheet.getLastRow()-1, 1).setValue('"'+date+'"');
    sheet.getRange(2, 2, sheet.getLastRow()-1, 1).setValue(buildingCode);
    sheet.getRange(2, 1, sheet.getLastRow()-1, 1).setValue('"'+date+'"'); // add quotes to controlProgram so the field doesn't get split on commas
    var rangeReplace = sheet.getRange(1, 1, sheet.getLastRow()-1, 10);
    rangeReplace.createTextFinder(",").replaceAllWith("|");//commas in control program name jack up the csv
  } catch (err) {
    Logger.log(err);
    Logger.log('unable to edit sheet');
    GmailApp.sendEmail("evgeniyaengel@google.com", "Failed to edit sheet: " + sheet, "Error message: " + err);
  }
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

  sheet = newSheet.getSheets()[0]
  sheetName = sheet.getName();

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

function duplicateCheck(building, date, project_id, dataset_id, table_id) {
  const request = {
    query: 'select count(distinct building)' + 
              'from `' + project_id + '.' + dataset_id + '.' + table_id + 
              '` where building = "' + building + '"' +
              ' and date = "' + date + '" and control_program is not null and object_id is not null and device_id is not null;',
    useLegacySql: false
  };
  Logger.log('Querying for dupes');
  let queryResults = BigQuery.Jobs.query(request, project_id);
  let rows = queryResults.rows;

  return rows[0]['f'][0]['v']
}

function trashCleanup() {
  var threads = GmailApp.search("in:trash label: ALC Processed", 0, 300);
  for (i=0; i<threads.length; i++) { 
    Logger.log("Deleting " + threads[i].getLastMessageDate() + " from trash");
    // Gmail.Users.Messages.remove('me', threads[i].getId()); // leave out for debugging purposes
  }
}
