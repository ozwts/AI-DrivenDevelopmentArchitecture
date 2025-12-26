# METADATA
# title: DynamoDB deletion protection must be enabled
# description: DynamoDB tables should have deletion protection enabled to prevent accidental deletion
# scope: package
# schemas:
#   - input: schema["terraform-raw"]
# custom:
#   id: CUSTOM-AWS-0001
#   avd_id: CUSTOM-AWS-0001
#   provider: aws
#   service: dynamodb
#   severity: HIGH
#   short_code: dynamodb-deletion-protection
#   recommended_action: Set deletion_protection_enabled to true
#   input:
#     selector:
#       - type: terraform-raw
package custom.dynamodb.deletion_protection

import rego.v1

deny contains res if {
	some block in input.modules[_].blocks
	block.kind == "resource"
	block.type == "aws_dynamodb_table"
	attr := block.attributes.deletion_protection_enabled
	attr.value == false
	res := result.new(
		sprintf("DynamoDB table '%s' does not have deletion protection enabled", [block.name]),
		attr,
	)
}
