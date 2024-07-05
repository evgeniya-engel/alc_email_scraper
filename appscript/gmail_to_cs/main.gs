function filesToCloud() {

  // generate formatted dates
  var addedDate = new Date();
  addedDate.setDate(1);
  addedDate.setHours(0,0,0,0);
  var tomorrow = addedDate.setDate(addedDate.getDate() + 1);

  const addedDateStr = Utilities.formatDate(addedDate, 'America/Los_Angeles', 'yyyy/MM/dd'); // for filter
  const tomorrowStr = Utilities.formatDate(tomorrow, 'America/Los_Angeles', 'yyyy/MM/dd'); // for filter
  const addedDateStrDash = Utilities.formatDate(addedDate, 'America/Los_Angeles', 'yyyy-MM-dd');  // for cloud storage

  EMAIL_FILTER = "in:anywhere from:ALC OR from:WebCTRL subject:Points List is:unread has:attachment filename:csv after:"+ addedDateStr + "before:" + tomorrowStr
  MAX_NUM_THREADS = 250;

  // get attachments
  Logger.log("Fetching threads between " + addedDateStr + ' and ' + tomorrowStr)
  var threads = GmailApp.search(EMAIL_FILTER, 0, MAX_NUM_THREADS);
  Logger.log("Found " + threads.length + " threads.");

  for (i=0;i<threads.length;i++) { 
    Logger.log("Processing thread " + i)

    var messages = threads[i].getMessages();

    for (j=0;j<messages.length;j++){

      const subject = messages[j].getSubject();

      Logger.log("Fetching data for " + subject + "; " + messages[j].getDate());
      var attachment = messages[j].getAttachments()[0]; // already a blob

      uploadFileToCloudStorage(attachment, addedDateStrDash, subject);
      
    }

    threads[i].markRead();
    threads[i].moveToTrash();
    
  }

}