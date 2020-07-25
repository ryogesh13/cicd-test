"use strict";

import * as tl from "azure-pipelines-task-lib/task";
import DockerComposeConnection from "./dockercomposeconnection";
import * as utils from "./utils";

export function run(connection: DockerComposeConnection, outputUpdate: (data: string) => any): any {
    var command = connection.createComposeCommand();
    command.line(tl.getInput("dockerComposeCommand", true));

    return connection.execCommandWithLogging(command)
    .then((output) => outputUpdate(utils.writeTaskOutput("command", output)));
}
