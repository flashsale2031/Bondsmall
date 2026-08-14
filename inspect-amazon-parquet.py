from pathlib import Path
import pandas as pd
for name in ['train.parquet','test.parquet','eval.parquet']:
    p=Path('/home/ubuntu/work_bondsmall/amazon_products')/name
    try:
        df=pd.read_parquet(p)
    except Exception as e:
        print(name,'ERROR',repr(e)); continue
    print(name,'rows',len(df),'columns',list(df.columns))
    print(df.head(2).to_json(orient='records',force_ascii=False)[:2000])
