import io

HEADER = "unique_code,name,total_capacity,unit,unit_price,location,availability\n"


def upload(client, owner, text, name="spaces.csv"):
    return client.post(
        "/api/spaces/import",
        headers=owner["headers"],
        files={"file": (name, io.BytesIO(text.encode("utf-8")), "text/csv")},
    )


def test_happy_path(client, owner):
    csv_text = HEADER + "WH-001, Main Storage Room, 300, sq.ft, 150, Jaffna, available\nWH-002,Cold Room,50,pallets,12.5,Colombo,unavailable\n"
    r = upload(client, owner, csv_text)
    assert r.status_code == 200
    body = r.json()
    assert (body["total"], body["valid"], body["invalid"]) == (2, 2, 0)
    spaces = client.get("/api/spaces/mine", headers=owner["headers"]).json()
    assert {s["unique_code"] for s in spaces} == {"WH-001", "WH-002"}


def test_mixed_valid_and_invalid_rows(client, owner):
    csv_text = HEADER + "\n".join(
        [
            "OK-1,Good,100,sq.ft,10,Jaffna,available",
            "NEG,Neg price,100,sq.ft,-5,Jaffna,available",
            "ZERO,Zero cap,0,sq.ft,5,Jaffna,available",
            "TXT,Text cap,abc,sq.ft,5,Jaffna,available",
            "OK-1,Duplicate in file,100,sq.ft,10,Jaffna,available",
            "BADENUM,Bad enum,100,sq.ft,10,Jaffna,maybe",
            ",No code,100,sq.ft,10,Jaffna,available",
            "OK-2,Good 2,200,pallets,20,Colombo,unavailable",
        ]
    ) + "\n"
    r = upload(client, owner, csv_text)
    assert r.status_code == 200
    body = r.json()
    assert (body["total"], body["valid"], body["invalid"]) == (8, 2, 6)
    by_row = {e["row"]: e["error"] for e in body["errors"]}
    assert "unit_price" in by_row[3]
    assert "total_capacity" in by_row[4]
    assert "must be a number" in by_row[5]
    assert "Duplicate" in by_row[6]
    assert "availability" in by_row[7]
    assert "Missing" in by_row[8]
    # only the good rows were saved
    assert len(client.get("/api/spaces/mine", headers=owner["headers"]).json()) == 2


def test_code_already_in_database(client, owner, owner_b):
    upload(client, owner, HEADER + "SAME,First,10,u,1,Jaffna,available\n")
    r = upload(client, owner_b, HEADER + "same,Second,10,u,1,Jaffna,available\nNEW,New,10,u,1,Jaffna,available\n")
    body = r.json()
    assert body["valid"] == 1 and body["invalid"] == 1
    assert "already exists" in body["errors"][0]["error"]


def test_missing_column_rejects_whole_file(client, owner):
    r = upload(client, owner, "unique_code,name,total_capacity,unit,unit_price,location\nA,B,1,u,1,x\n")
    assert r.status_code == 400
    assert "availability" in r.json()["detail"]


def test_quoted_fields_with_commas(client, owner):
    r = upload(client, owner, HEADER + 'Q-1,"Warehouse, Block A",100,sq.ft,10,"Jaffna, North",available\n')
    assert r.json()["valid"] == 1
    assert client.get("/api/spaces/mine", headers=owner["headers"]).json()[0]["name"] == "Warehouse, Block A"


def test_only_owner_and_only_csv(client, customer, owner):
    assert upload(client, customer, HEADER).status_code == 403
    assert upload(client, owner, "hello", name="x.txt").status_code == 400
    assert client.post("/api/spaces/import").status_code == 401


def test_errors_are_logged_to_database(client, owner, db):
    from app.models import ImportBatch, ImportError
    upload(client, owner, HEADER + "A,a,1,u,1,l,available\nB,b,-1,u,1,l,available\n")
    batch = db.query(ImportBatch).one()
    assert (batch.total_rows, batch.valid_rows, batch.invalid_rows) == (2, 1, 1)
    err = db.query(ImportError).one()
    assert err.row_num == 3 and err.batch_id == batch.id
