##################################################
# DynamoDB Table Definitions
##################################################
locals {
  table_definitions = {
    todos = {
      hash_key  = "todoId"
      range_key = null
      attributes = [
        { name = "todoId", type = "S" },
        { name = "status", type = "S" },
        { name = "projectId", type = "S" },
        { name = "assigneeUserId", type = "S" }
      ]
      global_secondary_indexes = [
        {
          name            = "StatusIndex"
          hash_key        = "status"
          range_key       = null
          projection_type = "ALL"
        },
        {
          name            = "ProjectIdIndex"
          hash_key        = "projectId"
          range_key       = null
          projection_type = "ALL"
        },
        {
          name            = "AssigneeUserIdIndex"
          hash_key        = "assigneeUserId"
          range_key       = null
          projection_type = "ALL"
        }
      ]
      env_var_name = "TODOS_TABLE_NAME" # アプリケーションの環境変数名
    }
    projects = {
      hash_key  = "projectId"
      range_key = null
      attributes = [
        { name = "projectId", type = "S" }
      ]
      global_secondary_indexes = []
      env_var_name             = "PROJECTS_TABLE_NAME" # アプリケーションの環境変数名
    }
    users = {
      hash_key  = "userId"
      range_key = null
      attributes = [
        { name = "userId", type = "S" },
        { name = "sub", type = "S" }
      ]
      global_secondary_indexes = [
        {
          name            = "SubIndex"
          hash_key        = "sub"
          range_key       = null
          projection_type = "ALL"
        }
      ]
      env_var_name = "USERS_TABLE_NAME" # アプリケーションの環境変数名
    }
    attachments = {
      hash_key  = "todoId"
      range_key = "attachmentId"
      attributes = [
        { name = "todoId", type = "S" },
        { name = "attachmentId", type = "S" }
      ]
      global_secondary_indexes = []
      env_var_name             = "ATTACHMENTS_TABLE_NAME" # アプリケーションの環境変数名
    }
    project_members = {
      hash_key  = "projectId"
      range_key = "projectMemberId"
      attributes = [
        { name = "projectId", type = "S" },
        { name = "projectMemberId", type = "S" },
        { name = "userId", type = "S" }
      ]
      global_secondary_indexes = [
        {
          name            = "UserIdIndex"
          hash_key        = "userId"
          range_key       = null
          projection_type = "ALL"
        }
      ]
      env_var_name = "PROJECT_MEMBERS_TABLE_NAME" # アプリケーションの環境変数名
    }
  }
}
