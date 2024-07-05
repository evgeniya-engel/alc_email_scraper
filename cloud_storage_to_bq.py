import base64
import functions_framework
import re
import json
import pandas as pd
from datetime import date
from google.cloud import storage
from google.cloud import bigquery

@functions_framework.cloud_event
def getPointLists(cloud_event):

    PROJECT_ID = 'essential-keep-197822'
    CLOUD_REGION = 'us-central1'
    BQ_DATASET_ID = 'alc_point_export'
    BQ_TABLE_ID = 'alc_point_export'
    CS_BUCKET_NAME = 'alc-email-scrape'
    IMPORT_DATE = date.today().replace(day=1).strftime('%Y-%m-%d')

    storage_client = storage.Client()
    bq_client = bigquery.Client(project=PROJECT_ID)
    dataset_ref = bq_client.dataset(BQ_DATASET_ID)
    table_ref = dataset_ref.table(BQ_TABLE_ID)

    # CHECK IF DATA ALREADY EXISTS IN BQ
    query = f'''
            select distinct
                building
                from `{PROJECT_ID}.{BQ_DATASET_ID}.{BQ_TABLE_ID}`
                where date = "{IMPORT_DATE}"
            '''
    buildings = bq_client.query_and_wait(query)
    
    print(type(buildings))
    print(buildings)

    blobs = storage_client.list_blobs(CS_BUCKET_NAME, prefix=f'{IMPORT_DATE}/')

    if len(blobs) > 0:
        for blob in list(blobs):
            if blob.name not in buildings:
                print(blob.name)
                path = f'gs://{CS_BUCKET_NAME}/{blob.name}'
                df = pd.read_csv(path)
                df.drop('I/O Type', axis='columns', inplace=True)
                df.dropna(subset='Object ID', axis='rows')
                df = df[df['Object ID'].str.contains(':')]

                df['date'] = IMPORT_DATE
                df['building'] = re.search('[A-Z0-9]+-[A-Z0-9]+-[A-Z0-9]+', blob.name.replace(IMPORT_DATE, '')).group()
                df = df[['date', 'building', 'Location', 'Control Program', 'Name', 'Type', 
                        'Object ID', 'Device ID','Object Name', 'Path']]
                df.columns = ['date', 'building', 'location', 'control_program', 'name', 'type', 
                                'object_id', 'device_id', 'object_name', 'path']


                # LOAD DATA TO BIG QUERY
                job_config = bigquery.LoadJobConfig()
                job_config.write_disposition='WRITE_APPEND'
                job_config.schema=[
                    bigquery.SchemaField("date", "STRING", mode="REQUIRED"),
                    bigquery.SchemaField("building", "STRING", mode="REQUIRED"),
                    bigquery.SchemaField("location", "STRING", mode="REQUIRED"),
                    bigquery.SchemaField("control_program", "STRING", mode="REQUIRED"),
                    bigquery.SchemaField("name", "STRING", mode="REQUIRED"),
                    bigquery.SchemaField("type", "STRING", mode="REQUIRED"),
                    bigquery.SchemaField("object_id", "STRING", mode="REQUIRED"),
                    bigquery.SchemaField("device_id", "STRING", mode="REQUIRED"),
                    bigquery.SchemaField("object_name", "STRING", mode="REQUIRED"),
                    bigquery.SchemaField("path", "STRING", mode="REQUIRED")
                    ]

                job = bq_client.load_table_from_dataframe(
                    df,
                    table_ref,
                    job_config=job_config,
                )

                print(f"Errors: {job.errors}")

                try:
                    job.result()  # Waits for table load to complete.
                    print("Loaded {} rows into {}:{}.".format(job.output_rows, BQ_DATASET_ID, BQ_TABLE_ID))
                    print("Deleting ", blob.name)
                    blob.delete()

                except Exception as e:
                    print(e)
                    job.errors: print(job.errors)