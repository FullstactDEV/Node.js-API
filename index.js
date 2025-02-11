const Hapi = require('@hapi/hapi');
const oracledb = require('oracledb');

const init = async() => {
    //setting server
    const server = Hapi.server({
        port: 3000,
        host: 'localhost'
    });

    //setting connection with oracle local server
    let connection;

    try {

        connection = await oracledb.getConnection({ user: "system", password: "root", connectionString: "" });

        console.log("Successfully connected to Oracle Database");

        await connection.execute(`begin execute immediate 'create table mfg_invoice (invoice_id number generated always as identity, mfg_account_id number, invoice_no varchar(255), total number,  dateordered date, datedue date, status varchar(50), primary key (invoice_id))';
            exception when others then if sqlcode = -942 then raise; end if; end;`);

        await connection.execute(`begin execute immediate 'create table mfg_invoice_items ( invoice_id number generated always as identity,
                po_text varchar(255),
                po_no number,
                product_id NUMBER,
                sku VARCHAR(255),
                name VARCHAR(255) NOT NULL,
                quantity NUMBER NOT NULL,
                cost NUMBER NOT NULL,
                shipping_method varchar(50),
                shipping_no varchar(50),
                status varchar(50),
                primary key (invoice_id))';
            exception when others then if sqlcode = -942 then raise; end if; end;`);

    } catch (err) {
        console.error(err);
    }

    //----------------------------- invoice ------------------

    // Get all invoices
    server.route({
        method: 'GET',
        path: '/invoice',
        handler: async(req, h) => {
            result = await connection.execute(`
            select * from mfg_invoice `, [], { resultSet: true, outFormat: oracledb.OUT_FORMAT_OBJECT });
            const rs = result.resultSet;
            let row;
            var rsdata = [];

            while ((row = await rs.getRow())) {
                rsdata.push(row);
            }

            var data = {
                key: "invoices_getAll",
                status: 'success',
                data: rsdata
            }
            await rs.close();
            return data;
        }
    });

    // Create new invoices
    server.route({
        method: 'POST',
        path: '/invoice',
        handler: async(req, reply) => {
            try {
                const sql = `
            insert into mfg_invoice(mfg_account_id, invoice_no, total, dateordered, datedue, status) values(: 1,: 2,: 3,: 4,: 5,: 6)
            `;

                const rows = [req.payload.mfg_account_id, req.payload.invoice_no, req.payload.total, req.payload.dateordered, req.payload.datedue, req.payload.status];

                let result = await connection.execute(sql, rows);

                console.log(result.rowsAffected, "Rows Inserted");

                connection.commit();
                var data = {
                    key: 'invoices_create',
                    status: "success",
                }
                return data;
            } catch (error) {
                console.error(error);
            }
        }
    });

    // Update the details of a invoice
    server.route({
        method: 'PUT',
        path: '/invoice/{id}',
        handler: async(req, h) => {
            try {
                id = req.params.id;
                const rows = [req.payload.mfg_account_id, req.payload.invoice_no, req.payload.total, req.payload.dateordered, req.payload.datedue, req.payload.status];
                console.log('===', rows);
                result = await connection.execute(
                    "UPDATE mfg_invoice set mfg_account_id = :ACCOUNT_ID, invoice_no = :INVOICE_NO, total=:TOTAL, dateordered = :DATEORDERED, datedue = :DATEDUE, status = :STATUS where invoice_id = :ID", { ID: id, ACCOUNT_ID: req.payload.mfg_account_id, INVOICE_NO: req.payload.invoice_no, TOTAL: req.payload.total, DATEORDERED: req.payload.dateordered, DATEDUE: req.payload.datedue, STATUS: req.payload.status }
                );
                console.log("Rows updated: " + result.rowsAffected); // 2
                var data = {
                    key: "invoices_update",
                    status: "success"
                }
                return data;
            } catch (error) {
                return error;
            }
        }
    });

    // Delete a invoice from the database
    server.route({
        method: 'DELETE',
        path: '/invoice/{id}',
        handler: async(req, h) => {

            try {
                const sql = "DELETE FROM mfg_invoice WHERE invoice_id = :1 AND status <> 'Approved'";

                const bind = [req.params.id];

                const options = { autoCommit: true };

                const result = await connection.execute(sql, bind, options);

                console.log("Result is:", result);
                connection.commit();
                var data = {
                    key: 'invoices_delete',
                    status: "success",
                }
                return data;
            } catch (error) {
                console.error(error);
            }
        }
    });

    //----------------------------- invoice_items ------------------

    // Get all invoices
    server.route({
        method: 'GET',
        path: '/invoice_item',
        handler: async(req, h) => {
            try {
                result = await connection.execute(`
            select * from mfg_invoice_items `, [], { resultSet: true, outFormat: oracledb.OUT_FORMAT_OBJECT });
                console.log("===");
                const rs = result.resultSet;
                let row;
                var rsdata = [];

                while ((row = await rs.getRow())) {
                    rsdata.push(row);
                }

                var data = {
                    key: "invoices_item_getAll",
                    status: 'success',
                    data: rsdata
                }
                await rs.close();
                return data;

            } catch (error) {
                return error;
            }
        }
    });

    // Create new invoice
    server.route({
        method: 'POST',
        path: '/invoice_item',
        handler: async(req, reply) => {
            try {
                const sql = `
            insert into mfg_invoice_items(po_text, po_no, product_id, sku, name, quantity, cost, shipping_method, shipping_no, status) values(: 1,: 2,: 3,: 4,: 5,: 6,: 7,: 8,: 9,: 10)
            `;

                const rows = [req.payload.po_text, req.payload.po_no, req.payload.product_id, req.payload.sku, req.payload.name, req.payload.quantity, req.payload.cost, req.payload.shipping_method, req.payload.shipping_no, req.payload.status];

                let result = await connection.execute(sql, rows);

                console.log(result.rowsAffected, "Rows Inserted");

                connection.commit();
                var data = {
                    key: 'invoices_item_create',
                    status: "success",
                }
                return data;
            } catch (error) {
                console.error(error);
            }
        }
    });

    // Update the details of a invoice
    server.route({
        method: 'PUT',
        path: '/invoice_item/{id}',
        handler: async(req, h) => {
            try {
                id = req.params.id;
                // po_text, po_no, product_id, sku, name, quantity, cost, shipping_method, shipping_no, status
                result = await connection.execute(
                    "UPDATE mfg_invoice_items set po_text = :PO_TEXT, po_no = :PO_NO, product_id =:PRODUCT_ID, sku = :SKU, name = :NAME, quantity = :QUANTITY, cost =:COST, shipping_method = :SHIPPING_METHOD, shipping_no = :SHIPPING_NO, status = :STATUS where invoice_id = :ID", { ID: id, PO_TEXT: req.payload.po_text, PO_NO: req.payload.po_no, PRODUCT_ID: req.payload.product_id, SKU: req.payload.sku, NAME: req.payload.name, QUANTITY: req.payload.quantity, COST: req.payload.cost, SHIPPING_METHOD: req.payload.shipping_method, SHIPPING_NO: req.payload.shipping_no, STATUS: req.payload.status }
                );
                console.log("Rows updated: " + result.rowsAffected); // 2
                var data = {
                    key: "invoicesitem_update",
                    status: "success"
                }
                return data;
            } catch (error) {
                return error;
            }
        }
    });

    // Delete a movie from the database
    server.route({
        method: 'DELETE',
        path: '/invoice_item/{id}',
        handler: async(req, h) => {

            try {
                const sql = "DELETE FROM mfg_invoice_items WHERE invoice_id = :1 AND status <> 'Approved'";

                const bind = [req.params.id];

                const options = { autoCommit: true };

                const result = await connection.execute(sql, bind, options);

                console.log("Result is:", result);
                connection.commit();
                var data = {
                    key: 'invoices_item_delete',
                    status: "success",
                }
                return data;
            } catch (error) {
                console.error(error);
            }
        }
    });


    await server.start();
    console.log('Server running on %s', server.info.uri);
}

init();