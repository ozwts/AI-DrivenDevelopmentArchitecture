# METADATA
# title: Cognito User Pool deletion protection must be enabled
# description: Cognito User Pools should have deletion protection enabled to prevent accidental deletion
# scope: package
# schemas:
#   - input: schema["terraform-raw"]
# custom:
#   id: CUSTOM-AWS-0003
#   avd_id: CUSTOM-AWS-0003
#   provider: aws
#   service: cognito
#   severity: HIGH
#   short_code: cognito-deletion-protection
#   recommended_action: Set deletion_protection to ACTIVE
#   input:
#     selector:
#       - type: terraform-raw
package custom.cognito.deletion_protection

import rego.v1

deny contains res if {
	some block in input.modules[_].blocks
	block.kind == "resource"
	block.type == "aws_cognito_user_pool"
	attr := block.attributes.deletion_protection
	attr.value == "INACTIVE"
	res := result.new(
		sprintf("Cognito User Pool '%s' does not have deletion protection enabled", [block.name]),
		attr,
	)
}
