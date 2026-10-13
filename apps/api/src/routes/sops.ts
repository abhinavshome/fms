import { Router } from "express";
import { db } from "../db.js";
import { z } from "zod";

export function createSopsRouter() {
  const router = Router();

  router.get("/", async (_request, response) => {
    const sops = await db.manyOrNone("SELECT * FROM sops");
    response.json(sops);
  });

  router.post("/", async (req, res) => {
    try {
      //check if everything is there
      z.object({
        title: z.string(),
        objective: z.string(),
        scope: z.string(),
        accountabilityId: z.number().int().positive(),
        responsibilityIds: z.array(z.number().int().positive()),
      }).parse(req.body);

      const {
        title,
        objective,
        scope,
        accountabilityId,
        responsibilityIds,
        sections,
      } = req.body;

      //check if accointability id exists
      const roleDoesNotExist =
        (await db.query("select * from roles where id = $1", accountabilityId))
          .length === 0;

      if (roleDoesNotExist) {
        throw new Error(`Accountability ID ${accountabilityId} does not exist`);
      }

      //check if all responsibility IDs exists
      const missingResponsibilityRoleIDs = (
        await db.query(
          `SELECT * FROM 
            UNNEST(ARRAY[${responsibilityIds.join(",")}]) AS missing_ids 
            WHERE missing_ids NOT IN (SELECT id FROM roles)
        `,
        )
      ).map((r: any) => r.missing_ids);

      if (missingResponsibilityRoleIDs.length > 0) {
        throw new Error(
          "Roles with IDs " + missingResponsibilityRoleIDs + " does not exist",
        );
      }

      // const newSop = await db.one(
      //   `
      //       WITH new_sop AS (
      //           INSERT INTO sops (
      //               name,
      //               objective,
      //               scope,
      //               accountability_role_id
      //           )
      //           VALUES (
      //               $1,
      //               $2,
      //               $3,
      //               $4
      //           )
      //           RETURNING id
      //       ),
      //       new_responsibilities AS (
      //           INSERT INTO sop_responsibilities (sop_id, role_id)
      //           SELECT
      //               new_sop.id,
      //               v.vals
      //           FROM new_sop
      //           CROSS JOIN UNNEST($5::int[]) AS v(vals)
      //           RETURNING sop_id
      //       )
      //       SELECT id AS new_sop_id FROM new_sop
      //   `,
      //   [title, objective, scope, accountabilityId, responsibilityIds],
      // );

      const sql = `
          WITH new_sop AS (
              INSERT INTO sops (
                  name,
                  objective,
                  scope,
                  accountability_role_id
              )
              VALUES ($1, $2, $3, $4)
              RETURNING id
          ),

          new_responsibilities AS (
              INSERT INTO sop_responsibilities (
                  sop_id,
                  role_id
              )
              SELECT
                  new_sop.id,
                  v.role_id
              FROM new_sop
              CROSS JOIN UNNEST($5::int[]) AS v(role_id)
          ),

          new_section AS (
              INSERT INTO sop_sections (
                  sop_id,
                  serial_num,
                  description
              )
              SELECT
                  new_sop.id,
                  v.serial_num,
                  v.description
              FROM new_sop
              CROSS JOIN jsonb_to_recordset($6::jsonb) AS v(
                  serial_num int,
                  description text
              )
              RETURNING id, serial_num
          ),

          new_steps AS (
              INSERT INTO sop_steps (
                  sop_section_id,
                  serial_num,
                  description
              )
              SELECT
                  ns.id,
                  v.step_serial_num,
                  v.description
              FROM new_section ns
              INNER JOIN jsonb_to_recordset($7::jsonb) AS v(
                  section_serial_num int,
                  step_serial_num int,
                  description text
              )
                  ON ns.serial_num = v.section_serial_num
          )

          SELECT id
          FROM new_sop;
          `;

      const newSop = await db.one(sql, [
        title,
        objective,
        scope,
        accountabilityId,
        responsibilityIds,

        // sections
        JSON.stringify(
          sections.map((s: any, i: any) => ({
            serial_num: i + 1,
            description: s.label,
          })),
        ),

        // steps
        JSON.stringify(
          sections.reduce(
            (result: any[], section: any, sectionIndex: number) => {
              section.steps.forEach((step: any, stepIndex: number) => {
                result.push({
                  section_serial_num: sectionIndex + 1,
                  step_serial_num: stepIndex + 1,
                  description: step,
                });
              });

              return result;
            },
            [],
          ),
        ),
      ]);

      // console.log("New SOP ID:", result.id);
      res.json(newSop);
    } catch (err: any) {
      console.log("error happened", err);
      res.send(err.message);
    }
  });

  return router;
}

export const sopsRouter = createSopsRouter();
